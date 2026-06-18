export default function ConfirmButton({ children = "Excluir", onConfirm }) {
  function handleClick() {
    if (window.confirm("Tem certeza que deseja excluir este registro?")) {
      onConfirm();
    }
  }

  return <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleClick}>{children}</button>;
}
