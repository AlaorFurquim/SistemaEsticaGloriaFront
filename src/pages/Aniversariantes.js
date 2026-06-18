import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro } from "../utils/alerts";
import { mascaraTelefone } from "../utils/masks";

export default function Aniversariantes() {
  const [lista, setLista] = useState([]);
  const [mes, setMes] = useState(new Date().getMonth() + 1);

  async function carregar() {
    try {
      const res = await api.get(`/clientes/aniversariantes?mes=${mes}`);
      setLista(res.data);
    } catch {
      alertaErro("Não foi possível carregar os aniversariantes.");
    }
  }

  function enviarWhatsApp(cliente) {
    const telefone = (cliente.telefone || "").replace(/\D/g, "");
    if (!telefone) {
      alertaErro("Cliente sem telefone cadastrado.");
      return;
    }
    const mensagem = encodeURIComponent(`Olá ${cliente.nome}, passando para desejar um feliz aniversário! Que seu dia seja maravilhoso. 🎉`);
    window.open(`https://wa.me/55${telefone}?text=${mensagem}`, "_blank");
  }

  useEffect(() => { carregar(); }, []);

  return (
    <div>
      <PageHeader title="Aniversariantes" subtitle="Clientes aniversariantes para contato via WhatsApp" />

      <div className="panel mb-3">
        <div className="row g-2 align-items-end">
          <div className="col-md-3">
            <label>Mês</label>
            <select className="form-select" value={mes} onChange={e => setMes(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </div>
          <div className="col-md-2"><button className="btn btn-primary w-100" onClick={carregar}>Buscar</button></div>
        </div>
      </div>

      <div className="panel">
        <table className="table professional-table">
          <thead><tr><th>Dia</th><th>Cliente</th><th>Telefone</th><th>Ações</th></tr></thead>
          <tbody>
            {lista.map(c => (
              <tr key={c.id}>
                <td>{String(c.dia).padStart(2, "0")}/{String(c.mes).padStart(2, "0")}</td>
                <td>{c.nome}</td>
                <td>{mascaraTelefone(c.telefone || "")}</td>
                <td><button className="btn btn-success btn-sm" onClick={() => enviarWhatsApp(c)}>Enviar WhatsApp</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
