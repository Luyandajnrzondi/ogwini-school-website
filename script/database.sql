create table public.academic_calendar (
  id uuid not null default gen_random_uuid (),
  title text not null,
  description text null,
  start_date date null,
  end_date date null,
  category text null,
  constraint academic_calendar_pkey primary key (id)
) TABLESPACE pg_default;

create table public.academic_departments (
  id uuid not null default gen_random_uuid (),
  department_name text not null,
  description text null,
  head_of_department text null,
  constraint academic_departments_pkey primary key (id)
) TABLESPACE pg_default;


create table public.achievements (
  id uuid not null default gen_random_uuid (),
  title text not null,
  description text null,
  achievement_date date null,
  category text null,
  image_url text null,
  constraint achievements_pkey primary key (id)
) TABLESPACE pg_default;

create table public.admission_applications (
  id uuid not null default gen_random_uuid (),
  learner_name text not null,
  surname text not null,
  grade_applying integer null,
  date_of_birth date null,
  parent_name text null,
  parent_phone text null,
  parent_email text null,
  address text null,
  status text null default 'Pending'::text,
  created_at timestamp with time zone null default now(),
  constraint admission_applications_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_admission_status on public.admission_applications using btree (status) TABLESPACE pg_default;

create table public.admission_documents (
  id uuid not null default gen_random_uuid (),
  application_id uuid null,
  document_type text null,
  file_url text null,
  uploaded_at timestamp with time zone null default now(),
  constraint admission_documents_pkey primary key (id),
  constraint admission_documents_application_id_fkey foreign KEY (application_id) references admission_applications (id) on delete CASCADE
) TABLESPACE pg_default;


create table public.admissions_information (
  id uuid not null default gen_random_uuid (),
  overview text null,
  requirements text null,
  application_process text null,
  application_open boolean null default true,
  application_deadline date null,
  constraint admissions_information_pkey primary key (id)
) TABLESPACE pg_default;

create table public.announcements (
  id uuid not null default gen_random_uuid (),
  title text not null,
  content text null,
  start_date date null,
  end_date date null,
  priority text null default 'Medium'::text,
  constraint announcements_pkey primary key (id)
) TABLESPACE pg_default;

create table public.contact_messages (
  id uuid not null default gen_random_uuid (),
  name text not null,
  email text null,
  phone text null,
  subject text null,
  message text not null,
  is_read boolean null default false,
  submitted_at timestamp with time zone null default now(),
  constraint contact_messages_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_contact_read on public.contact_messages using btree (is_read) TABLESPACE pg_default;

create table public.cultural_activities (
  id uuid not null default gen_random_uuid (),
  activity_name text not null,
  description text null,
  facilitator text null,
  image_url text null,
  constraint cultural_activities_pkey primary key (id)
) TABLESPACE pg_default;

create table public.downloads (
  id uuid not null default gen_random_uuid (),
  title text not null,
  description text null,
  file_url text not null,
  category text null,
  uploaded_at timestamp with time zone null default now(),
  constraint downloads_pkey primary key (id)
) TABLESPACE pg_default;

create table public.events (
  id uuid not null default gen_random_uuid (),
  title text not null,
  description text null,
  event_date timestamp with time zone null,
  location text null,
  image_url text null,
  registration_required boolean null default false,
  constraint events_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_events_date on public.events using btree (event_date) TABLESPACE pg_default;

create table public.fixtures (
  id uuid not null default gen_random_uuid (),
  sport_id uuid null,
  opponent text null,
  fixture_date timestamp with time zone null,
  venue text null,
  result text null,
  status text null default 'Upcoming'::text,
  constraint fixtures_pkey primary key (id),
  constraint fixtures_sport_id_fkey foreign KEY (sport_id) references sports (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_fixtures_date on public.fixtures using btree (fixture_date) TABLESPACE pg_default;

create table public.gallery_categories (
  id uuid not null default gen_random_uuid (),
  name text not null,
  constraint gallery_categories_pkey primary key (id)
) TABLESPACE pg_default;

create table public.gallery_images (
  id uuid not null default gen_random_uuid (),
  category_id uuid null,
  title text null,
  image_url text not null,
  uploaded_at timestamp with time zone null default now(),
  constraint gallery_images_pkey primary key (id),
  constraint gallery_images_category_id_fkey foreign KEY (category_id) references gallery_categories (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_gallery_uploaded on public.gallery_images using btree (uploaded_at) TABLESPACE pg_default;

create table public.homepage_content (
  id uuid not null default gen_random_uuid (),
  hero_title text null,
  hero_subtitle text null,
  welcome_message text null,
  principal_message text null,
  cta_primary text null,
  cta_primary_link text null,
  cta_secondary text null,
  cta_secondary_link text null,
  updated_at timestamp with time zone null default now(),
  constraint homepage_content_pkey primary key (id)
) TABLESPACE pg_default;

create table public.homepage_slides (
  id uuid not null default gen_random_uuid (),
  title text null,
  description text null,
  image_url text null,
  display_order integer null default 0,
  is_active boolean null default true,
  constraint homepage_slides_pkey primary key (id)
) TABLESPACE pg_default;

create table public.homepage_statistics (
  id uuid not null default gen_random_uuid (),
  title text not null,
  value text not null,
  icon text null,
  display_order integer null default 0,
  constraint homepage_statistics_pkey primary key (id)
) TABLESPACE pg_default;


create table public.leadership_team (
  id uuid not null default gen_random_uuid (),
  name text not null,
  position text null,
  photo_url text null,
  email text null,
  bio text null,
  display_order integer null default 0,
  constraint leadership_team_pkey primary key (id)
) TABLESPACE pg_default;

create table public.news_categories (
  id uuid not null default gen_random_uuid (),
  name text not null,
  constraint news_categories_pkey primary key (id)
) TABLESPACE pg_default;

create table public.news_articles (
  id uuid not null default gen_random_uuid (),
  category_id uuid null,
  title text not null,
  slug text null,
  summary text null,
  content text null,
  featured_image text null,
  author text null,
  published_at timestamp with time zone null default now(),
  is_featured boolean null default false,
  constraint news_articles_pkey primary key (id),
  constraint news_articles_slug_key unique (slug),
  constraint news_articles_category_id_fkey foreign KEY (category_id) references news_categories (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_news_articles_slug on public.news_articles using btree (slug) TABLESPACE pg_default;

create index IF not exists idx_news_articles_published on public.news_articles using btree (published_at) TABLESPACE pg_default;

create table public.news_categories (
  id uuid not null default gen_random_uuid (),
  name text not null,
  constraint news_categories_pkey primary key (id)
) TABLESPACE pg_default;


create table public.newsletter_subscribers (
  id uuid not null default gen_random_uuid (),
  email text not null,
  subscribed_at timestamp with time zone null default now(),
  constraint newsletter_subscribers_pkey primary key (id),
  constraint newsletter_subscribers_email_key unique (email)
) TABLESPACE pg_default;

create table public.school_information (
  id uuid not null default gen_random_uuid (),
  school_name text null,
  motto text null,
  history text null,
  vision text null,
  mission text null,
  principal_name text null,
  principal_message text null,
  school_email text null,
  school_phone text null,
  school_address text null,
  created_at timestamp with time zone null default now(),
  constraint school_information_pkey primary key (id)
) TABLESPACE pg_default;


create table public.sports (
  id uuid not null default gen_random_uuid (),
  sport_name text not null,
  description text null,
  coach_name text null,
  image_url text null,
  constraint sports_pkey primary key (id)
) TABLESPACE pg_default;

create table public.student_leaders (
  id uuid not null default gen_random_uuid (),
  name text not null,
  position text null,
  photo_url text null,
  bio text null,
  year integer null,
  constraint student_leaders_pkey primary key (id)
) TABLESPACE pg_default;

create table public.subjects (
  id uuid not null default gen_random_uuid (),
  department_id uuid null,
  subject_name text not null,
  grade_start integer null,
  grade_end integer null,
  description text null,
  constraint subjects_pkey primary key (id),
  constraint subjects_department_id_fkey foreign KEY (department_id) references academic_departments (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.technical_subjects (
  id uuid not null default gen_random_uuid (),
  subject_name text not null,
  description text null,
  career_path text null,
  image_url text null,
  constraint technical_subjects_pkey primary key (id)
) TABLESPACE pg_default;

create table public.timetables (
  id uuid not null default gen_random_uuid (),
  grade text null,
  file_url text null,
  uploaded_at timestamp with time zone null default now(),
  constraint timetables_pkey primary key (id)
) TABLESPACE pg_default;

create table public.users (
  id uuid not null default gen_random_uuid (),
  email text null,
  full_name text null,
  role text null default 'staff'::text,
  created_at timestamp with time zone null default now(),
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email)
) TABLESPACE pg_default;

create table public.workshop_projects (
  id uuid not null default gen_random_uuid (),
  subject_id uuid null,
  title text not null,
  description text null,
  image_url text null,
  project_date date null,
  constraint workshop_projects_pkey primary key (id),
  constraint workshop_projects_subject_id_fkey foreign KEY (subject_id) references technical_subjects (id) on delete CASCADE
) TABLESPACE pg_default;

INSERT INTO "public"."subjects" ("id", "department_id", "subject_name", "grade_start", "grade_end", "description") VALUES ('2a65d638-d1e8-4a80-8636-7c13b2510ca0', 'be66bc83-0070-41f7-923b-694b90776b15', 'Accounting', 10, 12, null), ('2d37c643-f5f1-460d-9bbb-f2fcad3da4dc', 'f252f4d4-beae-41c0-9c3b-0ef5f76f53cd', 'Mathematical Literacy', 10, 12, null), ('4618bde0-f88b-411b-a149-880894ec005a', 'be66bc83-0070-41f7-923b-694b90776b15', 'Business Studies', 10, 12, null), ('6cfea1b0-05df-43fe-83ec-949795037fc0', '9b80a3c7-947d-4592-a295-f6d7bc045a0a', 'English
', 8, 12, null), ('835d9d2e-6ff1-4aff-aa82-ab120dceba19', '9b80a3c7-947d-4592-a295-f6d7bc045a0a', 'isiZulu', 8, 12, null), ('8b138f1f-919a-4660-858d-1b89213a4577', 'a45632ef-3dc4-450c-948d-e952caf2e667', 'Life Orientation', 8, 12, null), ('97c563d8-0a90-4f54-a5c5-519a680da907', 'a45632ef-3dc4-450c-948d-e952caf2e667', 'Geography', 10, 12, null), ('9bdf86a4-eadf-40ff-a17a-abba84e15aa8', '4bae55ff-ecc4-4fdc-a559-dc739f19c75d', 'Life Sciences', 10, 12, null), ('9e251d99-e1d2-4e6a-a3a0-cbd37ddeddca', 'a45632ef-3dc4-450c-948d-e952caf2e667', 'History', 10, 12, null), ('a7315b0d-5d4a-4ae7-b28b-e44f5ad27c68', 'f252f4d4-beae-41c0-9c3b-0ef5f76f53cd', 'Mathematics', 8, 12, null), ('b5ccd365-f8b8-4b64-935a-d76ddfcf4963', '4bae55ff-ecc4-4fdc-a559-dc739f19c75d', 'Physical Sciences', 10, 12, null), ('cd39f8c7-6ee8-464c-9dc7-ea3b286cc86e', 'be66bc83-0070-41f7-923b-694b90776b15', 'Economics', 10, 12, null);

INSERT INTO "public"."school_information" ("id", "school_name", "motto", "history", "vision", "mission", "principal_name", "principal_message", "school_email", "school_phone", "school_address", "created_at") VALUES ('b0115103-bbe5-4d7f-9f8a-67f9a6923eea', 'Ogwini Comprehensive Technical High School', 'Education for Life', null, 'To be a leading technical school producing skilled, well-rounded citizens.', 'To provide quality technical and academic education that empowers learners for the future.', 'The Principal', null, null, null, null, '2026-07-14 08:17:13.025929+00');

INSERT INTO "public"."news_categories" ("id", "name") VALUES ('46b69aa7-78f7-4942-8ef7-f390c3f901c1', 'Announcements'), ('883751ca-408b-4c79-98fd-f09decf1f857', 'Achievements'), ('8b49fbe6-2f0e-4a2a-91e1-a8f5996053cb', 'School News'), ('b608aa8e-0f06-4202-a830-094537e35a49', 'Events');

INSERT INTO "public"."homepage_statistics" ("id", "title", "value", "icon", "display_order") VALUES ('49520617-d277-4da9-be94-8eb6a7cb6a46', 'Pass Rate', '92%', 'award', 3), ('5a3668ec-24c1-4cbc-a962-d2ae1effde3b', 'Educators', '129+', 'graduation-cap', 2), ('ba34e2f6-9814-4f96-8694-61abbaccf406', 'Years of Excellence', '35+', 'calendar', 4), ('be36e277-af38-4f5a-b774-f9afcc269d99', 'Learners', '2782+', 'users', 1);

INSERT INTO "public"."homepage_content" ("id", "hero_title", "hero_subtitle", "welcome_message", "principal_message", "cta_primary", "cta_primary_link", "cta_secondary", "cta_secondary_link", "updated_at") VALUES ('f7a92751-b855-49d7-b367-ed55918e5eea', 'Welcome to Ogwini Comprehensive Technical High School', 'Education for Life', 'We nurture excellence in academics, technical skills, sports, and culture.', null, 'Apply Now', '/admissions', 'Learn More', '/about', '2026-07-14 08:17:13.025929+00');

INSERT INTO "public"."gallery_categories" ("id", "name") VALUES ('33b25c10-500b-4784-b991-5c4ea094fd6e', 'Campus'), ('473311af-d991-4d29-905e-e3d4ca08c523', 'Cultural Events'), ('79fad22b-35b3-443d-9669-515fff1b312b', 'Workshops'), ('ab327524-b123-4785-b3b0-fa937747b0c9', 'Graduation'), ('fc003861-9de5-4fd7-bce3-a178bae7940d', 'Sports');

INSERT INTO "public"."admissions_information" ("id", "overview", "requirements", "application_process", "application_open", "application_deadline") VALUES ('e61ff8ee-87ef-4df2-a1cc-48bec9edfe8c', 'Ogwini welcomes applications from learners for Grades 8 to 12.', 'Certified copy of birth certificate, latest report card, proof of residence, immunisation record.', 'Complete the online application form, upload the required documents, and await confirmation.', true, null);

INSERT INTO "public"."academic_departments" ("id", "department_name", "description", "head_of_department") VALUES ('4bae55ff-ecc4-4fdc-a559-dc739f19c75d', 'Sciences', null, null), ('9b80a3c7-947d-4592-a295-f6d7bc045a0a', 'Languages', null, 'Luyanda Zondi'), ('a45632ef-3dc4-450c-948d-e952caf2e667', 'Humanities', null, null), ('be66bc83-0070-41f7-923b-694b90776b15', 'Commerce', null, null), ('f252f4d4-beae-41c0-9c3b-0ef5f76f53cd', 'Mathematics', null, null);