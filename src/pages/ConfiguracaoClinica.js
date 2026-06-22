import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso } from "../utils/alerts";

const inicial = {
  nome: "",
  cnpj: "",
  endereco: "",
  telefone: "",
  email: "",
  cidade: "",
  uf: ""
};

const campos = [
  { chave: "nome", label: "Nome", classe: "col-md-3" },
  { chave: "cnpj", label: "CNPJ", classe: "col-md-3" },
  { chave: "endereco", label: "Endereço", classe: "col-md-6" },
  { chave: "telefone", label: "Telefone", classe: "col-md-3" },
  { chave: "email", label: "Email", classe: "col-md-3" },
  { chave: "cidade", label: "Cidade", classe: "col-md-3" },
  { chave: "uf", label: "UF", classe: "col-md-3" }
];

export default function ConfiguracaoClinica() {
  const [form, setForm] = useState(inicial);

  useEffect(() => {
    api.get("/configuracao-clinica")
      .then((res) => setForm({ ...inicial, ...(res.data || {}) }))
      .catch(() => alertaErro("Não foi possível carregar a clínica."));
  }, []);

  async function salvar(e) {
    e.preventDefault();

    try {
      await api.put("/configuracao-clinica", form);
      alertaSucesso("Configuração salva.");
    } catch (err) {
      alertaErro(err.response?.data || "Não foi possível salvar.");
    }
  }

  return (
    <div>
      <PageHeader title="Clínica" subtitle="Dados usados em receitas, termos e documentos" />

      <form className="panel" onSubmit={salvar}>
        <div className="row g-2">
          {campos.map((campo) => (
            <div className={campo.classe} key={campo.chave}>
              <label>{campo.label}</label>
              <input
                className="form-control"
                value={form[campo.chave] || ""}
                onChange={(e) => setForm({ ...form, [campo.chave]: e.target.value })}
              />
            </div>
          ))}

          <div className="col-md-2 d-flex align-items-end">
            <button className="btn btn-primary w-100">Salvar</button>
          </div>
        </div>
      </form>
    </div>
  );
}
