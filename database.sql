CREATE DATABASE IF NOT EXISTS resume_builder;
USE resume_builder;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  username VARCHAR(80) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  phone VARCHAR(30),
  location VARCHAR(120),
  linkedin VARCHAR(255),
  github VARCHAR(255),
  professional_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS education (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  institution VARCHAR(180) NOT NULL,
  degree VARCHAR(120) NOT NULL,
  field_of_study VARCHAR(120),
  start_date DATE,
  end_date DATE,
  grade VARCHAR(50),
  description TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  skill_name VARCHAR(100) NOT NULL,
  skill_level VARCHAR(30) DEFAULT 'Intermediate',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  project_name VARCHAR(180) NOT NULL,
  description TEXT,
  technologies VARCHAR(500),
  project_link VARCHAR(255),
  start_date DATE,
  end_date DATE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS experience (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  company VARCHAR(180) NOT NULL,
  job_title VARCHAR(120) NOT NULL,
  start_date DATE,
  end_date DATE,
  description TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resume_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_name VARCHAR(80) NOT NULL UNIQUE,
  description VARCHAR(255)
);

INSERT IGNORE INTO resume_templates (id, template_name, description)
VALUES
(1, 'Minimal', 'Clean black and white professional resume'),
(2, 'Modern', 'Modern professional resume with accent styling');
