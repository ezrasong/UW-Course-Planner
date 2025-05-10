CREATE TABLE users (
  id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100)
);

CREATE TABLE user_courses (
  user_id VARCHAR(128),
  course_code VARCHAR(10),
  term VARCHAR(10),
  completed TINYINT(1) DEFAULT 0,
  PRIMARY KEY (user_id, course_code),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
