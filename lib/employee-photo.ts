/**
 * Where an employee's avatar comes from.
 *
 * The employees list no longer carries `photo`. It held a base64 data URL of
 * roughly 41 KB, and at the backend's 200-row page cap that was ~8 MB of JSON
 * on every dashboard load — paid whether or not a single avatar was rendered.
 *
 * The list now carries `photoUrl` instead, pointing at a per-employee endpoint.
 * The browser fetches each avatar once and reuses it across every page showing
 * the same person. Single-employee responses still include `photo` directly,
 * since one row is not worth a second request.
 */

type PhotoSource = {
  photo?: string | null;
  photoUrl?: string | null;
  avatar?: string | null;
};

/**
 * The `src` to hand an <EmployeeAvatar>, or undefined when there is no photo —
 * in which case the avatar falls back to its initials-and-gender placeholder.
 *
 * `photoUrl` arrives as an API-relative path (`/employees/EMP1/photo`). It is
 * prefixed here because the browser reaches the backend through the Next.js
 * proxy mounted at `/api`, never directly.
 */
export const resolveEmployeePhotoSrc = (
  employee: PhotoSource | null | undefined,
): string | undefined => {
  if (!employee) return undefined;

  // An inlined data URL, when we already have one, costs no extra request.
  if (employee.photo) return employee.photo;
  if (employee.photoUrl) return `/api${employee.photoUrl}`;
  return employee.avatar ?? undefined;
};
