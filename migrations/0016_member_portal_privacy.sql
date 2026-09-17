-- M16 Member Portal Privacy

ALTER TABLE tour_booking_members ADD COLUMN portal_token VARCHAR(64) NULL;
ALTER TABLE tour_booking_members ADD COLUMN email VARCHAR(150) NULL AFTER phone;
ALTER TABLE tour_booking_members ADD UNIQUE INDEX idx_member_portal_token (portal_token);

ALTER TABLE tour_bookings ADD COLUMN group_leader_member_id INT NULL AFTER members_required;

CREATE INDEX idx_tour_booking_members_token ON tour_booking_members(portal_token);

INSERT INTO schema_migrations (version) VALUES ('0016_member_portal_privacy');
