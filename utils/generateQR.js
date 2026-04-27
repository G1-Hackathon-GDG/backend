import { v4 as uuidv4 } from "uuid";

export function generateQRToken() {
  return uuidv4();
}
