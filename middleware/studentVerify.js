import {
  isValidStudentId,
  getStudentIdError,
} from "../utils/studentIdValidator.js";

const studentVerify = (req, res, next) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const { studentId } = body;

  if (Object.keys(body).length === 0) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid or missing JSON body. Set Content-Type to application/json.",
    });
  }

  if (!studentId || studentId.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Student ID is required.",
    });
  }

  if (!isValidStudentId(studentId.trim())) {
    return res.status(400).json({
      success: false,
      message: getStudentIdError(),
    });
  }

  next();
};

export default studentVerify;
