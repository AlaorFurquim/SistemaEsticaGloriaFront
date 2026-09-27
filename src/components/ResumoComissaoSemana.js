import { Link } from "react-router-dom";
import useMinhasComissoes from "../hooks/useMinhasComissoes";
import { formatarMoeda } from "../utils/masks";

export const dataComissao = valor => valor?.slice(0, 10).split("-").reverse().join("/");

export default function ResumoComissaoSemana() {
  const { dados, erro, carregando, atualizar } = useMinhasComissoes();
  return <section className="comissao-semana-destaque" aria-label="Minha comissão da semana">
    <div><span className="comissao-semana-label">Sua comissão da semana</span>
      {carregando ? <span role="status">Carregando…</span> : erro ? <span role="alert">{erro}</span> : dados && <>
        <strong className="comissao-semana-valor">{formatarMoeda(dados.totalComissao)}</strong>
        <small>{dataComissao(dados.inicioSemana)} a {dataComissao(dados.fimSemana)} · Segunda a domingo</small>
      </>}
    </div>
    {erro ? <button type="button" className="btn btn-outline-primary" onClick={atualizar}>Tentar novamente</button> : <Link className="btn btn-primary" to="/minhas-comissoes">Ver minhas comissões</Link>}
  </section>;
}
