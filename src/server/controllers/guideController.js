import {
  getGroupsByGuideUserId, getGroupTourById, getMilestonesByGroupId,
  updateMilestone, getGroupMessages, createGroupMessage,
  getGuidePollsByGroup, createGuidePoll, castPollVote, getPollResults, closePoll,
  createGroupLocation, getActiveGroupLocation, endGroupLocation,
  findUserById, getAllUsers, logAuditAction
} from '../models/index.js';

export async function getGuideDashboard(req, res, next) {
  try {
    const groups = await getGroupsByGuideUserId(req.session.user.id);
    res.render('guide/dashboard', {
      title: 'My Groups',
      groups,
      formatPrice: res.locals.formatPrice
    });
  } catch (err) {
    console.error('[Guide Dashboard Error]', err.message, err.stack);
    next(err);
  }
}

export async function viewGroupDetail(req, res, next) {
  try {
    const group = await getGroupTourById(req.params.id);
    if (!group || group.assigned_guide_user_id !== req.session.user.id) {
      return res.status(404).render('errors/404', { title: 'Group Not Found' });
    }

    const milestones = await getMilestonesByGroupId(group.id);
    const messages = await getGroupMessages(group.id);
    const polls = await getGuidePollsByGroup(group.id);

    // Get poll results for each poll
    const pollsWithResults = [];
    for (const poll of polls) {
      const results = await getPollResults(poll.id);
      const options = typeof poll.options === 'string' ? JSON.parse(poll.options) : poll.options;
      pollsWithResults.push({ ...poll, options, results });
    }

    // Get members
    const { getBookingMembersForLeader } = await import('../models/index.js');
    const members = await getBookingMembersForLeader(group.booking_id);

    // Get active location
    const activeLocation = await getActiveGroupLocation(group.id);

    res.render('guide/group-detail', {
      title: group.title,
      group,
      milestones,
      messages,
      polls: pollsWithResults,
      members,
      activeLocation,
      formatPrice: res.locals.formatPrice
    });
  } catch (err) {
    next(err);
  }
}

export async function confirmMilestone(req, res, next) {
  try {
    const { id, milestoneId } = req.params;
    const group = await getGroupTourById(id);
    if (!group || group.assigned_guide_user_id !== req.session.user.id) {
      return res.status(404).render('errors/404', { title: 'Group Not Found' });
    }

    const milestones = await getMilestonesByGroupId(group.id);
    const milestone = milestones.find(m => m.id === Number(milestoneId));
    if (milestone && milestone.status === 'pending') {
      await updateMilestone(milestoneId, { status: 'ready' });
      await createGroupMessage({
        group_tour_id: group.id,
        sender_user_id: req.session.user.id,
        sender_name: req.session.user.name,
        message: `Milestone "${milestone.title}" is now ready for confirmation.`,
        message_type: 'milestone'
      });
    }

    res.redirect(`/guide/group/${id}`);
  } catch (err) {
    next(err);
  }
}

export async function sendMessageToGroup(req, res, next) {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const group = await getGroupTourById(id);
    if (!group || group.assigned_guide_user_id !== req.session.user.id) {
      return res.status(404).render('errors/404', { title: 'Group Not Found' });
    }

    if (message && message.trim()) {
      await createGroupMessage({
        group_tour_id: group.id,
        sender_user_id: req.session.user.id,
        sender_name: req.session.user.name,
        message: message.trim(),
        message_type: 'text'
      });
    }

    res.redirect(`/guide/group/${id}`);
  } catch (err) {
    next(err);
  }
}

export async function createPoll(req, res, next) {
  try {
    const { id } = req.params;
    const { question, options } = req.body;
    const group = await getGroupTourById(id);
    if (!group || group.assigned_guide_user_id !== req.session.user.id) {
      return res.status(404).render('errors/404', { title: 'Group Not Found' });
    }

    if (question && options) {
      const optionsArray = Array.isArray(options) ? options : options.split('\n').map(o => o.trim()).filter(Boolean);
      if (optionsArray.length >= 2) {
        await createGuidePoll({
          group_tour_id: group.id,
          created_by_user_id: req.session.user.id,
          question: question.trim(),
          options: optionsArray
        });
        await createGroupMessage({
          group_tour_id: group.id,
          sender_user_id: req.session.user.id,
          sender_name: req.session.user.name,
          message: `New poll: "${question.trim()}"`,
          message_type: 'poll'
        });
      }
    }

    res.redirect(`/guide/group/${id}`);
  } catch (err) {
    next(err);
  }
}

export async function closePollAction(req, res, next) {
  try {
    const { id, pollId } = req.params;
    const group = await getGroupTourById(id);
    if (!group || group.assigned_guide_user_id !== req.session.user.id) {
      return res.status(404).render('errors/404', { title: 'Group Not Found' });
    }

    await closePoll(pollId);
    res.redirect(`/guide/group/${id}`);
  } catch (err) {
    next(err);
  }
}

export async function postAdminMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const group = await getGroupTourById(id);
    if (!group || group.assigned_guide_user_id !== req.session.user.id) {
      return res.status(404).render('errors/404', { title: 'Group Not Found' });
    }

    if (message && message.trim()) {
      const adminEmail = process.env.ADMIN_EMAIL || 'ztts@apexsol.pk';
      const { sendEmail } = await import('../services/emailService.js');
      try {
        await sendEmail({
          to: adminEmail,
          subject: `[Guide Message] ${req.session.user.name} — ${group.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
              <div style="background: #1a3a2a; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="margin: 0; color: #d4a843;">GUIDE MESSAGE TO ADMIN</h1>
              </div>
              <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0;">
                <p><strong>From:</strong> ${req.session.user.name} (${req.session.user.email})</p>
                <p><strong>Group:</strong> ${group.title}</p>
                <p><strong>Message:</strong></p>
                <p style="background: #f7fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #d4a843;">${message.trim()}</p>
              </div>
            </div>
          `,
          text: `Guide Message from ${req.session.user.name}\nGroup: ${group.title}\nMessage: ${message.trim()}`
        });
      } catch (e) {
        console.error('[Guide] Admin email failed:', e.message);
      }

      await createGroupMessage({
        group_tour_id: group.id,
        sender_user_id: req.session.user.id,
        sender_name: req.session.user.name,
        message: `[To Admin] ${message.trim()}`,
        message_type: 'text'
      });

      await logAuditAction({
        user_id: req.session.user.id,
        user_name: req.session.user.name,
        action: 'GUIDE_MESSAGE_ADMIN',
        entity_type: 'group',
        entity_id: group.id,
        details: `Guide sent message to admin about group: ${group.title}`
      });
    }

    res.redirect(`/guide/group/${id}`);
  } catch (err) {
    next(err);
  }
}

export async function postShareDetails(req, res, next) {
  try {
    const { id } = req.params;
    const { share_type, content } = req.body;
    const group = await getGroupTourById(id);
    if (!group || group.assigned_guide_user_id !== req.session.user.id) {
      return res.status(404).render('errors/404', { title: 'Group Not Found' });
    }

    if (content && content.trim()) {
      const typeLabels = { maps: 'Map Shared', highlights: 'Highlights Shared', details: 'Tour Details Shared', milestone: 'Milestone Details Shared' };
      await createGroupMessage({
        group_tour_id: group.id,
        sender_user_id: req.session.user.id,
        sender_name: req.session.user.name,
        message: content.trim(),
        message_type: 'share',
        metadata: { share_type, label: typeLabels[share_type] || 'Shared Content' }
      });
    }

    res.redirect(`/guide/group/${id}`);
  } catch (err) {
    next(err);
  }
}

export async function postShareLocation(req, res, next) {
  try {
    const { id } = req.params;
    const { latitude, longitude, accuracy, label } = req.body;
    const group = await getGroupTourById(id);
    if (!group || group.assigned_guide_user_id !== req.session.user.id) {
      return res.status(404).render('errors/404', { title: 'Group Not Found' });
    }

    if (!latitude || !longitude) {
      return res.redirect(`/guide/group/${id}`);
    }

    const existing = await getActiveGroupLocation(group.id);
    if (existing) {
      await endGroupLocation(existing.id);
    }

    await createGroupLocation({
      group_tour_id: group.id,
      shared_by_user_id: req.session.user.id,
      sender_name: req.session.user.name,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy_meters: accuracy ? parseFloat(accuracy) : null,
      label: label || null
    });

    await createGroupMessage({
      group_tour_id: group.id,
      sender_user_id: req.session.user.id,
      sender_name: req.session.user.name,
      message: `📍 Location shared${label ? ': ' + label : ''}`,
      message_type: 'share',
      metadata: { share_type: 'location', label: label || 'Location Shared' }
    });

    res.redirect(`/guide/group/${id}`);
  } catch (err) {
    next(err);
  }
}

export async function postEndLocation(req, res, next) {
  try {
    const { id } = req.params;
    const group = await getGroupTourById(id);
    if (!group || group.assigned_guide_user_id !== req.session.user.id) {
      return res.status(404).render('errors/404', { title: 'Group Not Found' });
    }

    const active = await getActiveGroupLocation(group.id);
    if (active) {
      await endGroupLocation(active.id);
      await createGroupMessage({
        group_tour_id: group.id,
        sender_user_id: req.session.user.id,
        sender_name: req.session.user.name,
        message: '📍 Location sharing stopped',
        message_type: 'text'
      });
    }

    res.redirect(`/guide/group/${id}`);
  } catch (err) {
    next(err);
  }
}
