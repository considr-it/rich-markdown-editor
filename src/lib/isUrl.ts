import { isUri } from "valid-url";

export default function isUrl(text: string) {
  return isUri(text);
}
