import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro } from "../utils/alerts";
import { formatarMoeda, formatarDataHora } from "../utils/masks";

export default function AlertasOperacionais() {
  const [dados, setDados] = useState({ lotesVencendo: [], contasVencidas: [], lembretesHoje: [] });

  useEffect(() => {
    api.get("/alertas-operacionais")
      .then(r => setDados(r.data || dados))
      .catch(() => alertaErro("Não foi possível carregar alertas."));
  }, []);

  return (
    <div>
      <PageHeader title="Alertas" subtitle="Vencimentos, cobranças e lembretes que precisam de atenção" />
      <div className="row g-3">
        <div className="col-md-4">
          <div className="panel">
            <h5>Lotes vencendo</h5>
            {dados.lotesVencendo?.map(x => <div className="indicator-line" key={x.id}><span>{x.produto?.nome} - {x.lote}</span><strong>{x.validade ? new Date(x.validade).toLocaleDateString("pt-BR") : "-"}</strong></div>)}
            {!dados.lotesVencendo?.length && <p className="text-muted">Nada pendente.</p>}
          </div>
        </div>
        <div className="col-md-4">
          <div className="panel">
            <h5>Contas vencidas</h5>
            {dados.contasVencidas?.map(x => <div className="indicator-line" key={x.id}><span>{x.descricao}</span><strong>{formatarMoeda(x.valor)}</strong></div>)}
            {!dados.contasVencidas?.length && <p className="text-muted">Nada pendente.</p>}
          </div>
        </div>
        <div className="col-md-4">
          <div className="panel">
            <h5>Lembretes</h5>
            {dados.lembretesHoje?.map(x => <div className="indicator-line" key={x.id}><span>{x.cliente?.nome} - {x.tipo}</span><strong>{formatarDataHora(x.dataAgendada)}</strong></div>)}
            {!dados.lembretesHoje?.length && <p className="text-muted">Nada pendente.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
