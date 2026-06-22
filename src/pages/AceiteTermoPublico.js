import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

function parseTermo(texto) {
  const linhas = String(texto || "")
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);

  const itens = [];
  const introducao = [];
  const lgpdImagem = [];
  const contrato = [];
  let resumo = "";
  let final = "";
  let secao = "introducao";

  for (const linha of linhas) {
    if (/^Servicos e itens aceitos:/i.test(linha)) {
      secao = "itens";
      continue;
    }

    if (/^LGPD e uso de imagem:/i.test(linha)) {
      secao = "lgpdImagem";
      continue;
    }

    if (/^Resumo do orcamento:/i.test(linha)) {
      resumo = linha;
      continue;
    }

    if (/^Contrato e informacoes adicionais:/i.test(linha)) {
      secao = "contrato";
      continue;
    }

    if (/^Ao confirmar este aceite/i.test(linha)) {
      final = linha;
      secao = "final";
      continue;
    }

    if (secao === "itens" && linha.startsWith("-")) {
      itens.push(linha.replace(/^-\s*/, ""));
      continue;
    }

    if (secao === "contrato") {
      contrato.push(linha);
      continue;
    }

    if (secao === "lgpdImagem") {
      lgpdImagem.push(linha);
      continue;
    }

    if (secao === "introducao") {
      introducao.push(linha);
    }
  }

  return { introducao, lgpdImagem, itens, resumo, contrato, final };
}

function parseItem(item) {
  const partes = item.split("|").map((parte) => parte.trim());
  return {
    descricao: partes[0] || item,
    quantidade: partes.find((parte) => /^Quantidade:/i.test(parte)) || "",
    valorUnitario: partes.find((parte) => /^Valor unitario:/i.test(parte)) || "",
    total: partes.find((parte) => /^Total:/i.test(parte)) || ""
  };
}

export default function AceiteTermoPublico() {
  const { token } = useParams();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [autorizaUsoImagem, setAutorizaUsoImagem] = useState(false);

  async function carregar() {
    try {
      const res = await api.get(`/atendimentos/aceite/${token}`);
      setDados(res.data);
      setAutorizaUsoImagem(!!res.data?.autorizaUsoImagem);
    } catch (error) {
      setErro(error.response?.data || "Termo não encontrado.");
    }
  }

  async function concordar() {
    try {
      setSalvando(true);
      const res = await api.post(`/atendimentos/aceite/${token}/concordar`, { autorizaUsoImagem });
      setDados((atual) => ({ ...atual, ...res.data }));
    } catch (error) {
      setErro(error.response?.data || "Não foi possível registrar o aceite.");
    } finally {
      setSalvando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [token]);

  const termo = useMemo(() => parseTermo(dados?.texto), [dados]);

  return (
    <main className="public-accept-page">
      <section className="public-accept-card">
        {erro ? (
          <>
            <h1>Termo indisponível</h1>
            <p>{erro}</p>
          </>
        ) : !dados ? (
          <p>Carregando termo...</p>
        ) : (
          <>
            <span className="public-accept-kicker">Termo de consentimento, contrato e LGPD</span>
            <h1>{dados.procedimento || "Atendimento"}</h1>
            <p className="public-accept-subtitle">{dados.paciente || "Paciente"}</p>

            <div className="public-accept-sections">
              <section>
                <h2>Consentimento</h2>
                {termo.introducao.map((linha, index) => (
                  <p key={index}>{linha}</p>
                ))}
              </section>

              {termo.lgpdImagem.length ? (
                <section>
                  <h2>LGPD e uso de imagem</h2>
                  {termo.lgpdImagem.map((linha, index) => (
                    <p key={index}>{linha}</p>
                  ))}
                </section>
              ) : null}

              {termo.itens.length ? (
                <section>
                  <h2>Serviços e itens aceitos</h2>
                  <div className="public-accept-items">
                    {termo.itens.map((item, index) => {
                      const parsed = parseItem(item);
                      return (
                        <article key={index}>
                          <strong>{parsed.descricao}</strong>
                          <span>{parsed.quantidade}</span>
                          <span>{parsed.valorUnitario}</span>
                          <b>{parsed.total}</b>
                        </article>
                      );
                    })}
                  </div>
                  {termo.resumo ? <div className="public-accept-summary">{termo.resumo}</div> : null}
                </section>
              ) : null}

              {termo.contrato.length ? (
                <section>
                  <h2>Contrato</h2>
                  <div className="public-accept-contract">
                    {termo.contrato.map((linha, index) => (
                      <p key={index}>{linha}</p>
                    ))}
                  </div>
                </section>
              ) : null}

              {termo.final ? (
                <section className="public-accept-final-text">
                  <p>{termo.final}</p>
                </section>
              ) : null}
            </div>

            {dados.termoAceito ? (
              <div className="public-accept-done">
                <strong>Aceite registrado.</strong>
                <span>Obrigado. Você já pode fechar esta página.</span>
              </div>
            ) : (
              <>
                <label className="public-image-consent">
                  <input
                    type="checkbox"
                    checked={autorizaUsoImagem}
                    onChange={(e) => setAutorizaUsoImagem(e.target.checked)}
                  />
                  <span>
                    Autorização separada: autorizo o uso de minha imagem para divulgação, redes sociais, portfólio, materiais comerciais ou publicidade, sem identificação nominal quando possível.
                  </span>
                </label>
                <button type="button" className="btn btn-primary public-accept-button" onClick={concordar} disabled={salvando}>
                  Li e concordo com o termo, contrato e LGPD
                </button>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}
