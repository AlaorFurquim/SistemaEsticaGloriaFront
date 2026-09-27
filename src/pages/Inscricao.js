import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import api from "../api";
import { alertaErro, alertaSucesso } from "../utils/alerts";
import { mascaraTelefone } from "../utils/masks";
import { linkLiberacaoWhatsApp, linkSuporteWhatsApp } from "../utils/whatsappSupport";

const inicial = {
  nomeEmpresa: "",
  nomeResponsavel: "",
  email: "",
  telefone: "",
  senha: "",
  cnpj: "",
  endereco: "",
  cidade: "",
  uf: "",
  solicitarTeste: true,
  ofertaToken: "",
  aceitePermanencia: false,
  aceiteContrato: false,
  versaoContrato: ""
};

const criteriosSenha = (senha) => ({
  tamanho: senha.length >= 8,
  maiuscula: /[A-Z]/.test(senha),
  minuscula: /[a-z]/.test(senha),
  numero: /\d/.test(senha),
  especial: /[^A-Za-z0-9]/.test(senha)
});

const mascararCnpj = (valor) => valor.replace(/\D/g, "").slice(0, 14)
  .replace(/^(\d{2})(\d)/, "$1.$2")
  .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
  .replace(/\.(\d{3})(\d)/, ".$1/$2")
  .replace(/(\d{4})(\d)/, "$1-$2");

const dataUtc = (valor) => {
  if (!valor) return null;
  const possuiFuso = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(valor);
  return new Date(possuiFuso ? valor : `${valor}Z`);
};

export default function Inscricao() {
  const [form, setForm] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [plano, setPlano] = useState({
    valorMensalidade: 199,
    valorTabela: 499,
    valorPromocional: 299,
    valorOfertaImediata: 199,
    ofertaExpiraEm: null,
    ofertaAtiva: false,
    permanenciaMeses: 12,
    multaCancelamentoPercentual: 30,
    diasTeste: 7,
    versaoContrato: "",
    textoContrato: ""
  });
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const [cadastroConcluido, setCadastroConcluido] = useState(null);

  useEffect(() => {
    const tokenSalvo = sessionStorage.getItem("ofertaCadastroToken") || "";
    api.get("/publico/configuracao-inscricao", { params: tokenSalvo ? { ofertaToken: tokenSalvo } : {} })
      .then((resposta) => {
        const dados = resposta.data || {};
        if (dados.ofertaToken) sessionStorage.setItem("ofertaCadastroToken", dados.ofertaToken);
        setForm((atual) => ({ ...atual, ofertaToken: dados.ofertaToken || tokenSalvo }));
        setPlano({
        valorMensalidade: Number(dados.valorMensalidade || 299),
        valorTabela: Number(dados.valorTabela || 499),
        valorPromocional: Number(dados.valorPromocional || 299),
        valorOfertaImediata: Number(dados.valorOfertaImediata || 199),
        ofertaExpiraEm: dados.ofertaExpiraEm || null,
        ofertaAtiva: !!dados.ofertaAtiva,
        permanenciaMeses: Number(dados.permanenciaMeses || 12),
        multaCancelamentoPercentual: Number(dados.multaCancelamentoPercentual || 30),
        diasTeste: Number(dados.diasTeste ?? 7),
        versaoContrato: dados.versaoContrato || "",
        textoContrato: dados.textoContrato || ""
      });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!plano.ofertaAtiva || !plano.ofertaExpiraEm) {
      setSegundosRestantes(0);
      return undefined;
    }

    const atualizar = () => {
      const expiracao = dataUtc(plano.ofertaExpiraEm);
      const restante = Math.max(0, Math.min(300, Math.ceil((expiracao.getTime() - Date.now()) / 1000)));
      setSegundosRestantes(restante);
      if (restante === 0) {
        setPlano((atual) => ({ ...atual, ofertaAtiva: false, valorMensalidade: atual.valorPromocional }));
        api.get("/publico/configuracao-inscricao", { params: { ofertaToken: form.ofertaToken } })
          .then((resposta) => setPlano((atual) => ({
            ...atual,
            valorMensalidade: Number(resposta.data?.valorMensalidade || atual.valorPromocional),
            ofertaAtiva: !!resposta.data?.ofertaAtiva,
            textoContrato: resposta.data?.textoContrato || atual.textoContrato
          })))
          .catch(() => {});
      }
    };
    atualizar();
    const timer = setInterval(atualizar, 1000);
    return () => clearInterval(timer);
  }, [plano.ofertaAtiva, plano.ofertaExpiraEm, plano.valorPromocional, form.ofertaToken]);

  const alterar = (campo, valor) => setForm((atual) => ({ ...atual, [campo]: valor }));
  const senhaValida = Object.values(criteriosSenha(form.senha)).every(Boolean);

  async function cadastrar(e) {
    e.preventDefault();
    if (enviando) return;
    if (!senhaValida) return alertaErro("Crie uma senha forte atendendo a todos os requisitos.");
    try {
      setEnviando(true);
      if (!form.aceitePermanencia) return alertaErro("Confirme a permanência mínima e a regra de cancelamento.");
      if (!form.aceiteContrato || !plano.versaoContrato) return alertaErro("Leia e aceite o contrato para concluir o cadastro.");
      const resposta = await api.post("/publico/inscricao", { ...form, versaoContrato: plano.versaoContrato });
      localStorage.setItem("loginEmail", form.email.trim().toLowerCase());
      alertaSucesso(resposta.data?.mensagem || "Empresa cadastrada.");
      setCadastroConcluido({ dados: { ...form }, cobranca: resposta.data?.cobranca || null, contrato: resposta.data?.contrato || null });
    } catch (erro) {
      alertaErro(erro.response?.data || "Nao foi possivel concluir o cadastro.");
    } finally {
      setEnviando(false);
    }
  }

  function imprimirContrato() {
    const contrato = cadastroConcluido?.contrato;
    if (!contrato?.texto) return alertaErro("A cópia do contrato não está disponível.");
    const janela = window.open("", "_blank");
    if (!janela) return alertaErro("Permita a abertura da janela para imprimir o contrato.");
    janela.opener = null;
    janela.document.title = `Contrato Lap Beauty - ${cadastroConcluido.dados.nomeEmpresa}`;
    const estilo = janela.document.createElement("style");
    estilo.textContent = "body{font-family:Arial,sans-serif;max-width:850px;margin:36px auto;padding:0 24px;color:#24151b;line-height:1.55}h1{font-size:24px;color:#6b1836}dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 14px;background:#f8f3f4;padding:16px}dt{font-weight:700}dd{margin:0;word-break:break-word}pre{white-space:pre-wrap;font:13px/1.55 Arial,sans-serif;border-top:2px solid #6b1836;padding-top:20px}@media print{button{display:none}body{margin:0;max-width:none}}";
    janela.document.head.appendChild(estilo);
    const titulo = janela.document.createElement("h1");
    titulo.textContent = "Contrato de uso do Lap Beauty";
    janela.document.body.appendChild(titulo);
    const resumo = janela.document.createElement("dl");
    [["Empresa", cadastroConcluido.dados.nomeEmpresa], ["Mensalidade contratada", Number(contrato.valorContratado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })], ["Permanência mínima", `${contrato.permanenciaMeses} meses`], ["Multa antecipada", `${contrato.multaCancelamentoPercentual}% conforme cálculo contratual`], ["Versão", contrato.versao], ["Aceito em", new Date(contrato.aceitoEm).toLocaleString("pt-BR")], ["Hash SHA-256", contrato.hashSha256]].forEach(([rotulo, valor]) => {
      const dt = janela.document.createElement("dt");
      const dd = janela.document.createElement("dd");
      dt.textContent = rotulo;
      dd.textContent = valor || "-";
      resumo.append(dt, dd);
    });
    janela.document.body.appendChild(resumo);
    const texto = janela.document.createElement("pre");
    texto.textContent = contrato.texto;
    janela.document.body.appendChild(texto);
    const botao = janela.document.createElement("button");
    botao.textContent = "Imprimir ou salvar em PDF";
    botao.onclick = () => janela.print();
    janela.document.body.appendChild(botao);
  }

  return (
    <main className="signup-page">
      <section className="signup-intro">
        <div className="signup-brand">
          <span className="signup-brand-mark">LB</span>
          <strong>Lap Beauty</strong>
        </div>
        <div>
          <span className="signup-kicker">Comece seu teste</span>
          <h1>Sua empresa pronta para atender, organizar e crescer.</h1>
          <p>Cadastre a clinica e crie o primeiro acesso administrativo em poucos minutos.</p>
        </div>
      </section>

      {cadastroConcluido ? (
        <section className="signup-form signup-success" aria-live="polite">
          <span className="signup-success-icon">✓</span>
          <span className="signup-kicker">Cadastro recebido</span>
          <h2>{cadastroConcluido.dados.solicitarTeste ? "Seu teste gratuito está liberado" : "Agora solicite a liberação do acesso"}</h2>
          <p>{cadastroConcluido.dados.solicitarTeste
            ? "Você já pode entrar no sistema. O período de teste termina automaticamente em 7 dias."
            : "Sua empresa foi cadastrada. Envie a mensagem pronta ao suporte para avisar nossa equipe e concluir a liberação."}</p>
          <div className="signup-success-company"><span>Empresa</span><strong>{cadastroConcluido.dados.nomeEmpresa}</strong><small>{cadastroConcluido.dados.email}</small></div>
          {!cadastroConcluido.dados.solicitarTeste && cadastroConcluido.cobranca?.pixConfigurado && cadastroConcluido.cobranca?.pixCopiaECola ? (
            <div className="signup-payment">
              <QRCodeSVG value={cadastroConcluido.cobranca.pixCopiaECola} size={210} level="M" />
              <div><span>Primeira mensalidade</span><strong>{Number(cadastroConcluido.cobranca.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong><small>Vencimento em {new Date(cadastroConcluido.cobranca.vencimento).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</small><textarea value={cadastroConcluido.cobranca.pixCopiaECola} readOnly /><button type="button" className="btn btn-outline-dark" onClick={() => navigator.clipboard.writeText(cadastroConcluido.cobranca.pixCopiaECola)}>Copiar codigo PIX</button></div>
            </div>
          ) : !cadastroConcluido.dados.solicitarTeste ? <p className="signup-payment-warning">O PIX ainda não está disponível. Fale com o suporte para concluir a liberação.</p> : null}
          {!cadastroConcluido.dados.solicitarTeste && <p className="signup-payment-note">Depois do pagamento, avise nossa equipe. O acesso será liberado assim que confirmarmos o recebimento.</p>}
          {cadastroConcluido.contrato ? (
            <details className="signup-contract-copy">
              <summary>Contrato assinado e comprovante</summary>
              <dl>
                <div><dt>Mensalidade</dt><dd>{Number(cadastroConcluido.contrato.valorContratado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</dd></div>
                <div><dt>Permanência</dt><dd>{cadastroConcluido.contrato.permanenciaMeses} meses</dd></div>
                <div><dt>Multa</dt><dd>{cadastroConcluido.contrato.multaCancelamentoPercentual}% conforme contrato</dd></div>
                <div><dt>Versão</dt><dd>{cadastroConcluido.contrato.versao}</dd></div>
                <div><dt>Aceito em</dt><dd>{new Date(cadastroConcluido.contrato.aceitoEm).toLocaleString("pt-BR")}</dd></div>
                <div><dt>Hash SHA-256</dt><dd>{cadastroConcluido.contrato.hashSha256}</dd></div>
              </dl>
              <pre>{cadastroConcluido.contrato.texto}</pre>
              <button type="button" className="btn btn-outline-dark" onClick={imprimirContrato}>Imprimir ou salvar em PDF</button>
            </details>
          ) : null}
          {!cadastroConcluido.dados.solicitarTeste && <a className="btn btn-success signup-whatsapp" href={linkLiberacaoWhatsApp(cadastroConcluido.dados)} target="_blank" rel="noreferrer">Avisar pagamento pelo WhatsApp</a>}
          <Link className="btn btn-primary signup-paid-button" to="/login">{cadastroConcluido.dados.solicitarTeste ? "Entrar no sistema" : "Já paguei"}</Link>
        </section>
      ) : <form className="signup-form" onSubmit={cadastrar}>
        <header>
          <h2>Cadastrar empresa</h2>
          <p>Os dados institucionais poderao ser completados depois.</p>
        </header>

        <div className={`signup-offer ${plano.ofertaAtiva ? "active" : "expired"}`}>
          <div className="signup-offer-prices">
            <span className="signup-list-price">Preço normal <s>{plano.valorTabela.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</s></span>
            <span className="signup-promo-price">Promoção: {plano.valorPromocional.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês</span>
            <strong>{plano.valorMensalidade.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}<small>/mês</small></strong>
          </div>
          {plano.ofertaAtiva ? (
            <div className="signup-countdown" aria-live="polite">
              <span>Oferta imediata termina em</span>
              <strong>{String(Math.floor(segundosRestantes / 60)).padStart(2, "0")}:{String(segundosRestantes % 60).padStart(2, "0")}</strong>
              <small>O prazo não reinicia ao atualizar esta página.</small>
            </div>
          ) : (
            <div className="signup-countdown"><span>Oferta relâmpago encerrada</span><strong>{plano.valorPromocional.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês</strong><small>A condição promocional continua disponível.</small></div>
          )}
          <p>{plano.diasTeste > 0 ? `${plano.diasTeste} dias de teste antes da primeira cobrança.` : "Cobrança iniciada após a contratação."}</p>
        </div>

        <fieldset className="signup-access-choice">
          <legend>Como deseja começar?</legend>
          <label className={form.solicitarTeste ? "selected" : ""}>
            <input type="radio" name="modalidade" checked={form.solicitarTeste} onChange={() => alterar("solicitarTeste", true)} />
            <span><strong>Teste grátis por 7 dias</strong><small>Acesso liberado agora. Limitado a um teste por CNPJ.</small></span>
          </label>
          <label className={!form.solicitarTeste ? "selected" : ""}>
            <input type="radio" name="modalidade" checked={!form.solicitarTeste} onChange={() => alterar("solicitarTeste", false)} />
            <span><strong>Contratar agora</strong><small>Gere o PIX da primeira mensalidade e aguarde a confirmação.</small></span>
          </label>
        </fieldset>

        <div className="signup-grid">
          <label className="signup-wide">Nome da empresa
            <input className="form-control" value={form.nomeEmpresa} onChange={(e) => alterar("nomeEmpresa", e.target.value)} required />
          </label>
          <label>Responsavel
            <input className="form-control" value={form.nomeResponsavel} onChange={(e) => alterar("nomeResponsavel", e.target.value)} required />
          </label>
          <label>Telefone
            <input
              className="form-control"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(00) 00000-0000"
              maxLength={15}
              value={form.telefone}
              onChange={(e) => alterar("telefone", mascaraTelefone(e.target.value))}
              required
            />
          </label>
          <label className="signup-wide">E-mail de acesso
            <input type="email" className="form-control" autoComplete="email" value={form.email} onChange={(e) => alterar("email", e.target.value)} required />
          </label>
          <label>Senha
            <div className="password-field">
              <input type={mostrarSenha ? "text" : "password"} className="form-control" value={form.senha} onChange={(e) => alterar("senha", e.target.value)} minLength={8} required />
              <button type="button" className="password-toggle" onClick={() => setMostrarSenha((valor) => !valor)} aria-label="Mostrar ou ocultar senha">
                {mostrarSenha ? "🙈" : "👁️"}
              </button>
            </div>
            <ul className="password-requirements">
              {Object.entries({ tamanho: "8 ou mais caracteres", maiuscula: "Uma letra maiuscula", minuscula: "Uma letra minuscula", numero: "Um numero", especial: "Um caractere especial" }).map(([chave, texto]) => <li className={criteriosSenha(form.senha)[chave] ? "valid" : ""} key={chave}>{texto}</li>)}
            </ul>
          </label>
          <label>CNPJ {form.solicitarTeste ? "(obrigatório para o teste)" : ""}
            <input className="form-control" inputMode="numeric" placeholder="00.000.000/0000-00" maxLength={18} value={form.cnpj} onChange={(e) => alterar("cnpj", mascararCnpj(e.target.value))} required={form.solicitarTeste} />
          </label>
          <label className="signup-wide">Endereco
            <input className="form-control" value={form.endereco} onChange={(e) => alterar("endereco", e.target.value)} />
          </label>
          <label>Cidade
            <input className="form-control" value={form.cidade} onChange={(e) => alterar("cidade", e.target.value)} />
          </label>
          <label>UF
            <input className="form-control" maxLength={2} value={form.uf} onChange={(e) => alterar("uf", e.target.value.toUpperCase())} />
          </label>
        </div>

        <section className="signup-contract" aria-labelledby="signup-contract-title">
          <header>
            <div>
              <span className="signup-kicker">Assinatura eletrônica</span>
              <h3 id="signup-contract-title">Contrato de uso do Lap Beauty</h3>
            </div>
            <small>Versão {plano.versaoContrato || "carregando..."}</small>
          </header>
          <div className="signup-contract-text" tabIndex="0">{plano.textoContrato || "Carregando contrato..."}</div>
          <label className="signup-contract-accept">
            <input
              type="checkbox"
              checked={form.aceiteContrato && form.aceitePermanencia}
              disabled={!plano.versaoContrato}
              onChange={(e) => setForm((atual) => ({
                ...atual,
                aceiteContrato: e.target.checked,
                aceitePermanencia: e.target.checked
              }))}
              required
            />
            <span><strong>Li e concordo com o contrato.</strong> Estou autorizado(a) a representar a empresa e aceito todas as condições, inclusive a permanência mínima de {plano.permanenciaMeses} meses, a multa de {plano.multaCancelamentoPercentual}% nas condições descritas e o prazo de arrependimento de 7 dias, ressalvados os direitos previstos em lei.</span>
          </label>
        </section>

        <button className="btn btn-primary signup-submit" disabled={enviando || !form.aceitePermanencia || !form.aceiteContrato || !plano.versaoContrato}>
          {enviando ? "Criando sua empresa..." : "Criar minha conta"}
        </button>
        <Link className="signup-back" to="/login">Voltar para o login</Link>
        <a className="signup-support-link" href={linkSuporteWhatsApp("Ola! Preciso de ajuda para cadastrar minha empresa na plataforma Lap Beauty.")} target="_blank" rel="noreferrer">Precisa de ajuda? Fale com o suporte</a>
      </form>}
    </main>
  );
}
