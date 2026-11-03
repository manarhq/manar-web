/**
 * Step-up from the browser: posts a form to /api/auth/reauth, which sends the person through the
 * identity provider again and back to `returnTo` (a path on this site; the callback checks it).
 * A form POST, so the route's cross-site check applies and no other site can trigger it.
 */
export function startReauth(locale: string, returnTo: string): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/auth/reauth";
  form.hidden = true;
  for (const [name, value] of [
    ["locale", locale],
    ["returnTo", returnTo],
  ]) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}
