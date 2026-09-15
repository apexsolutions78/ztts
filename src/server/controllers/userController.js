import { getAllUsers, findUserById, createUser, updateUser, deleteUser, logAuditAction } from '../models/index.js';

export async function listUsers(req, res, next) {
  try {
    const users = await getAllUsers();
    res.render('admin/users/index', {
      title: 'User Management',
      users
    });
  } catch (error) {
    next(error);
  }
}

export async function getNewUserForm(req, res) {
  res.render('admin/users/new', {
    title: 'Create New User'
  });
}

export async function postCreateUser(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).render('admin/users/new', {
        title: 'Create New User',
        error: 'Name, email, and password are required.'
      });
    }

    const user = await createUser({ name, email, password, role: role || 'agent' });

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'CREATE_USER',
      entity_type: 'user',
      entity_id: user.id,
      details: `Created user: ${name} (${email}) as ${role || 'agent'}`
    });

    res.redirect('/admin/users?created=true');
  } catch (error) {
    next(error);
  }
}

export async function getEditUserForm(req, res, next) {
  try {
    const user = await findUserById(req.params.id);
    if (!user) return res.status(404).render('errors/404', { title: 'User Not Found' });
    res.render('admin/users/edit', {
      title: `Edit User: ${user.name}`,
      editUser: user
    });
  } catch (error) {
    next(error);
  }
}

export async function postUpdateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;
    if (!name || !email) {
      const user = await findUserById(id);
      return res.status(400).render('admin/users/edit', {
        title: `Edit User: ${user?.name}`,
        editUser: { ...user, ...req.body, id },
        error: 'Name and email are required.'
      });
    }

    await updateUser(id, { name, email, role, password: password || undefined });

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'UPDATE_USER',
      entity_type: 'user',
      entity_id: id,
      details: `Updated user: ${name} (${email})`
    });

    res.redirect('/admin/users?updated=true');
  } catch (error) {
    next(error);
  }
}

export async function postDeleteUser(req, res, next) {
  try {
    const { id } = req.params;
    // Prevent self-deletion
    if (Number(id) === req.session.user.id) {
      return res.redirect('/admin/users?error=self-delete');
    }

    const user = await findUserById(id);
    await deleteUser(id);

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'DELETE_USER',
      entity_type: 'user',
      entity_id: id,
      details: `Deleted user: ${user ? user.name : id}`
    });

    res.redirect('/admin/users?deleted=true');
  } catch (error) {
    next(error);
  }
}
