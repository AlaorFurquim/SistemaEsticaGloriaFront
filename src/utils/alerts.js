import Swal from "sweetalert2";

const config = {
  confirmButtonColor: "#7c3aed",
  cancelButtonColor: "#6b7280",
  reverseButtons: true,
  allowOutsideClick: false
};

export const alertaSucesso = (mensagem) =>
  Swal.fire({
    icon: "success",
    title: "Operação realizada",
    text: mensagem,
    confirmButtonColor: "#7c3aed",
    timer: 2500,
    timerProgressBar: true,
    showConfirmButton: false
  });

export const alertaErro = (mensagem) =>
  Swal.fire({
    icon: "error",
    title: "Erro",
    text: mensagem,
    confirmButtonColor: "#dc2626",
    allowOutsideClick: false
  });

export const alertaAviso = (mensagem) =>
  Swal.fire({
    icon: "warning",
    title: "Atenção",
    text: mensagem,
    confirmButtonColor: "#f59e0b"
  });

export const alertaInfo = (titulo, html) =>
  Swal.fire({
    icon: "info",
    title: titulo,
    html,
    confirmButtonColor: "#2563eb"
  });

export const confirmarExclusao = async () => {
  const result = await Swal.fire({
    title: "Deseja realmente excluir?",
    text: "Esta ação não poderá ser desfeita.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim, excluir",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#6b7280",
    reverseButtons: true
  });

  return result.isConfirmed;
};

export const confirmarInativacao = async () => {
  const result = await Swal.fire({
    title: "Deseja inativar este registro?",
    text: "O registro permanecerá no sistema, porém não poderá mais ser utilizado.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim, inativar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#f59e0b",
    cancelButtonColor: "#6b7280",
    reverseButtons: true
  });

  return result.isConfirmed;
};

export const confirmarAcao = async (titulo, mensagem) => {
  const result = await Swal.fire({
    title: titulo,
    text: mensagem,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Confirmar",
    cancelButtonText: "Cancelar",
    ...config
  });

  return result.isConfirmed;
};

export const loading = () =>
  Swal.fire({
    title: "Processando...",
    text: "Aguarde um momento.",
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

export const fecharLoading = () => {
  Swal.close();
};