import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "/api"
});
let unidadeDaTela;

export function definirUnidadeDaTela(id) {
  unidadeDaTela = id || undefined;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token && !config.url?.includes("/auth/login")) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (unidadeDaTela && !/^\/?(auth|publico)\//.test(config.url || "")) {
    config.headers["X-Lapcare-Unidade"] = String(unidadeDaTela);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && ["TENANT_SEM_ACESSO", "TESTE_EXPIRADO"].includes(error.response?.data?.codigo)) {
      const emailLembrado = localStorage.getItem("loginEmail");
      localStorage.clear();
      if (emailLembrado) localStorage.setItem("loginEmail", emailLembrado);
      sessionStorage.setItem("mensagemAcesso", error.response.data.mensagem);
      if (window.location.pathname !== "/login") window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

export default api;
