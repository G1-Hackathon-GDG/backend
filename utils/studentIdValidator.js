const isValidStudentId = (studentId) => {
  const pattern = process.env.STUDENT_ID_REGEX;

  if (!pattern) {
    console.warn("⚠️  STUDENT_ID_REGEX not set in .env — skipping validation");
    return true;
  }

  const regex = new RegExp(pattern);
  return regex.test(studentId);
};

const getStudentIdError = () => {
  return "Invalid Student ID format. Expected format: ETS1234/16";
};

export { isValidStudentId, getStudentIdError };
