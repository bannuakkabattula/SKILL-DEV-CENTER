-- ============================================================================
-- SAMPLE DATA — run AFTER schema.sql, and after you have logged in once
-- (so a profile row exists). Safe to re-run only if you clear tables first.
-- ============================================================================

insert into centers (center_code, center_name, center_type, address, village, mandal, city, district, state, pincode, contact_number, email, center_incharge, center_coordinator, establishment_date, status, approved_strength)
values
('KKD-001','Kakinada Center','PMKVY Center','Main Road, Kakinada','Kakinada Rural','Kakinada','Kakinada','East Godavari','Andhra Pradesh','533001','9440011111','kakinada@sdcerp.org','Ravi Kumar','Lakshmi Devi','2022-06-01','active',300),
('RJY-001','Rajahmundry Center','PMKVY Center','Innespeta, Rajahmundry','Rajahmundry Urban','Rajahmundry','Rajahmundry','East Godavari','Andhra Pradesh','533101','9440022222','rajahmundry@sdcerp.org','Suresh Babu','Anitha Rao','2022-08-15','active',250),
('ELR-001','Eluru Center','PMKVY Center','Ramachandra Rao Peta, Eluru','Eluru Urban','Eluru','Eluru','West Godavari','Andhra Pradesh','534001','9440033333','eluru@sdcerp.org','Krishna Murthy','Padma Priya','2023-01-10','under_verification',200),
('TNL-001','Tenali Center','PMKVY Center','Angalakuduru Road, Tenali','Tenali Urban','Tenali','Tenali','Guntur','Andhra Pradesh','522201','9440044444','tenali@sdcerp.org','Venkat Rao','Sirisha','2023-03-20','active',220);

insert into center_infrastructure (center_id, classrooms, labs, computers, working_computers, non_working_computers, projectors, smart_tvs, printers, cctv, internet, power_backup, drinking_water, washrooms)
select id, 6, 2, 40, 36, 4, 4, 2, 2, true, true, true, true, 6 from centers where center_code = 'KKD-001';
insert into center_infrastructure (center_id, classrooms, labs, computers, working_computers, non_working_computers, projectors, smart_tvs, printers, cctv, internet, power_backup, drinking_water, washrooms)
select id, 5, 2, 30, 28, 2, 3, 1, 1, true, true, false, true, 4 from centers where center_code = 'RJY-001';
insert into center_infrastructure (center_id, classrooms, labs, computers, working_computers, non_working_computers, projectors, smart_tvs, printers, cctv, internet, power_backup, drinking_water, washrooms)
select id, 4, 1, 20, 15, 5, 2, 1, 1, false, true, false, true, 3 from centers where center_code = 'ELR-001';
insert into center_infrastructure (center_id, classrooms, labs, computers, working_computers, non_working_computers, projectors, smart_tvs, printers, cctv, internet, power_backup, drinking_water, washrooms)
select id, 5, 2, 32, 30, 2, 3, 2, 2, true, true, true, true, 5 from centers where center_code = 'TNL-001';

insert into employees (employee_code, full_name, designation, department, center_id, mobile, email, qualification, experience_years, date_of_joining, employee_type, status)
select 'EMP-1001','Ravi Kumar','Center Incharge','Administration', id, '9440011111','ravi.kumar@sdcerp.org','MBA', 8, '2022-06-01','full_time','active' from centers where center_code='KKD-001';
insert into employees (employee_code, full_name, designation, department, center_id, mobile, email, qualification, experience_years, date_of_joining, employee_type, status)
select 'EMP-1002','Divya Sri','Trainer','Training', id, '9440011122','divya.sri@sdcerp.org','B.Tech', 4, '2022-07-10','full_time','active' from centers where center_code='KKD-001';
insert into employees (employee_code, full_name, designation, department, center_id, mobile, email, qualification, experience_years, date_of_joining, employee_type, status)
select 'EMP-1003','Mahesh Babu','Mobilizer','Mobilization', id, '9440011133','mahesh.babu@sdcerp.org','Degree', 3, '2022-09-01','full_time','active' from centers where center_code='KKD-001';
insert into employees (employee_code, full_name, designation, department, center_id, mobile, email, qualification, experience_years, date_of_joining, employee_type, status)
select 'EMP-1004','Suresh Babu','Center Incharge','Administration', id, '9440022222','suresh.babu@sdcerp.org','MBA', 6, '2022-08-15','full_time','active' from centers where center_code='RJY-001';
insert into employees (employee_code, full_name, designation, department, center_id, mobile, email, qualification, experience_years, date_of_joining, employee_type, status)
select 'EMP-1005','Anitha Rao','Placement Officer','Placement', id, '9440022233','anitha.rao@sdcerp.org','MBA', 5, '2022-10-05','full_time','active' from centers where center_code='RJY-001';

insert into batches (batch_code, batch_name, center_id, course_name, qp_code, sector, scheme, start_date, end_date, duration, timing, trainer_id, approved_strength, enrolled_strength, status)
select 'B-KKD-01','Electrician Batch 1', c.id, 'Electrician','ELE/Q1234','Power','PMKVY 4.0','2025-01-15','2025-04-15','3 months','9:00 AM - 1:00 PM', e.id, 30, 27, 'ongoing'
from centers c join employees e on e.employee_code='EMP-1002' where c.center_code='KKD-001';

insert into students (student_code, candidate_name, parent_name, mobile, gender, dob, qualification, center_id, batch_id, course_name, enrollment_date, training_status)
select 'STU-20001','Anil Kumar','Ramaiah','9494011111','male','2005-04-12','10th Pass', c.id, b.id, 'Electrician','2025-01-15','training'
from centers c join batches b on b.batch_code='B-KKD-01' where c.center_code='KKD-001';
insert into students (student_code, candidate_name, parent_name, mobile, gender, dob, qualification, center_id, batch_id, course_name, enrollment_date, training_status)
select 'STU-20002','Sirisha Reddy','Venkataiah','9494011112','female','2005-07-22','Inter', c.id, b.id, 'Electrician','2025-01-15','training'
from centers c join batches b on b.batch_code='B-KKD-01' where c.center_code='KKD-001';

insert into tasks (task_title, description, center_id, assigned_employee_id, priority, due_date, status)
select 'Submit monthly attendance report','Compile and submit Jan attendance', c.id, e.id, 'high', current_date + interval '3 days', 'pending'
from centers c join employees e on e.employee_code='EMP-1001' where c.center_code='KKD-001';

insert into mobilization_leads (candidate_name, mobile, center_id, course_name, mobilizer_id, lead_source, follow_up_date, status)
select 'Naveen Chowdary','9494099999', c.id, 'Electrician', e.id, 'Field Visit', current_date + interval '5 days', 'interested'
from centers c join employees e on e.employee_code='EMP-1003' where c.center_code='KKD-001';

insert into center_documents (center_id, document_name, document_type, document_number, issue_date, expiry_date, status)
select id, 'Rental Agreement - Kakinada', 'Rental Agreement', 'RA-2022-001', '2022-06-01', current_date + interval '18 days', 'expiring_soon' from centers where center_code='KKD-001';
insert into center_documents (center_id, document_name, document_type, document_number, issue_date, expiry_date, status)
select id, 'Fire Safety Certificate - Eluru', 'Fire Safety Certificate', 'FSC-2023-004', '2023-01-10', current_date - interval '5 days', 'expired' from centers where center_code='ELR-001';
