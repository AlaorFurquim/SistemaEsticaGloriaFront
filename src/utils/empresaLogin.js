const CHAVE = "lembrarLoginEmpresa";
const normalizarEmail = email => String(email || "").trim().toLowerCase();
const codigoValido = codigo => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codigo || "");

export function esquecerEmpresaLogin() {
  try { localStorage.removeItem(CHAVE); } catch { /* A preferência é opcional. */ }
}

// Only call with branding obtained from the authenticated company endpoint.
// Keep the public code, never images, credentials or a directory of accounts.
export function lembrarEmpresaLogin(email, aparencia) {
  try {
    const lembrado = normalizarEmail(localStorage.getItem("lembrarLoginEmail"));
    if (!lembrado || lembrado !== normalizarEmail(email)) return;
    if (!aparencia?.configurada || !codigoValido(aparencia.codigoPublico)) {
      esquecerEmpresaLogin(); return;
    }
    localStorage.setItem(CHAVE, JSON.stringify({ email: lembrado, codigo: aparencia.codigoPublico }));
  } catch { /* Falhas de armazenamento não impedem o acesso. */ }
}

export function obterEmpresaLogin(email) {
  try {
    const lembrado = normalizarEmail(localStorage.getItem("lembrarLoginEmail"));
    const empresa = JSON.parse(localStorage.getItem(CHAVE) || "null");
    return lembrado && normalizarEmail(email) === lembrado && empresa?.email === lembrado && codigoValido(empresa.codigo)
      ? empresa.codigo : null;
  } catch { return null; }
}
