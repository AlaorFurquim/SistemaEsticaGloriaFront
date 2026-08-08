import {
  RESPOSTAS_CLINICAS,
  SECOES_PERGUNTAS_ANAMNESE,
  obterIndicadoresAnamnese
} from "../utils/anamneseClinica";

function CampoTexto({ label, value, onChange, textarea = false, rows = 3, placeholder = "" }) {
  const Componente = textarea ? "textarea" : "input";
  return (
    <label className="clinical-field">
      <span>{label}</span>
      <Componente
        className="form-control"
        rows={textarea ? rows : undefined}
        value={value || ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function PerguntaClinica({ campo, rotulo, atencao, resposta, onChange }) {
  return (
    <div className={`clinical-question ${resposta === "sim" ? "answered-yes" : ""} ${atencao ? "requires-attention" : ""}`}>
      <div className="clinical-question-label">
        <span>{rotulo}</span>
        {atencao && <small>Atenção clínica</small>}
      </div>
      <div className="clinical-segmented" role="group" aria-label={rotulo}>
        {RESPOSTAS_CLINICAS.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            className={resposta === opcao.valor ? "active" : ""}
            aria-pressed={resposta === opcao.valor}
            onClick={() => onChange(opcao.valor)}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AnamneseClinicaForm({ value, onChange }) {
  const ficha = value || {};
  const dados = ficha.dadosClinicos || {};
  const indicadores = obterIndicadoresAnamnese(ficha);

  function alterarFicha(campo, valor) {
    onChange({ ...ficha, [campo]: valor });
  }

  function alterarDado(campo, valor) {
    onChange({
      ...ficha,
      dadosClinicos: { ...dados, [campo]: valor }
    });
  }

  return (
    <div className="clinical-anamnesis">
      <div className="clinical-status-strip" aria-live="polite">
        <div>
          <span>Respondidas</span>
          <strong>{indicadores.total - indicadores.pendentes.length}/{indicadores.total}</strong>
        </div>
        <div className={indicadores.alertas.length ? "has-alert" : ""}>
          <span>Atenções clínicas</span>
          <strong>{indicadores.alertas.length}</strong>
        </div>
        <div className={indicadores.pendentes.length ? "is-pending" : ""}>
          <span>Pendentes</span>
          <strong>{indicadores.pendentes.length}</strong>
        </div>
      </div>

      <fieldset className="clinical-section clinical-section-open">
        <legend>Motivo, evolução e objetivo</legend>
        <div className="clinical-fields-grid">
          <label className="clinical-field">
            <span>Tipo de avaliação</span>
            <select className="form-select" value={dados.tipoAvaliacao || ""} onChange={(event) => alterarDado("tipoAvaliacao", event.target.value)}>
              <option value="">Selecione...</option>
              <option value="facial_injetavel">Facial / injetáveis</option>
              <option value="facial_pele">Facial / cuidados da pele</option>
              <option value="corporal_drenagem">Corporal / drenagem</option>
              <option value="outro">Outro</option>
            </select>
          </label>
          <CampoTexto label="Procedimento pretendido" value={dados.procedimentoPretendido} onChange={(valor) => alterarDado("procedimentoPretendido", valor)} />
          <CampoTexto label="Queixa principal *" value={ficha.queixaPrincipal} onChange={(valor) => alterarFicha("queixaPrincipal", valor)} textarea />
          <CampoTexto label="Início, duração e evolução da queixa" value={dados.inicioEvolucaoQueixa} onChange={(valor) => alterarDado("inicioEvolucaoQueixa", valor)} textarea />
          <CampoTexto label="Objetivo do tratamento" value={ficha.objetivoTratamento} onChange={(valor) => alterarFicha("objetivoTratamento", valor)} textarea />
          <CampoTexto label="Expectativa de resultado" value={dados.expectativaResultado} onChange={(valor) => alterarDado("expectativaResultado", valor)} textarea />
          <CampoTexto label="Motivação e impacto da queixa" value={dados.impactoQueixaMotivacao} onChange={(valor) => alterarDado("impactoQueixaMotivacao", valor)} textarea />
          <CampoTexto label="Histórico familiar relevante" value={dados.historicoFamiliar} onChange={(valor) => alterarDado("historicoFamiliar", valor)} textarea />
          <CampoTexto label="Área que será avaliada/tratada" value={dados.areaTratamento} onChange={(valor) => alterarDado("areaTratamento", valor)} />
        </div>
      </fieldset>

      {SECOES_PERGUNTAS_ANAMNESE.map((secao) => (
        <details className="clinical-section" key={secao.id} open={secao.id === "saude" ? true : undefined}>
          <summary>
            <span>{secao.titulo}</span>
            <small>{secao.descricao}</small>
          </summary>
          <div className="clinical-questions-grid">
            {secao.perguntas.map(([campo, rotulo, atencao]) => (
              <PerguntaClinica
                key={campo}
                campo={campo}
                rotulo={rotulo}
                atencao={atencao}
                resposta={dados[campo] || ""}
                onChange={(valor) => alterarDado(campo, valor)}
              />
            ))}
          </div>
          <CampoTexto
            label={secao.detalheRotulo}
            value={dados[secao.detalheCampo]}
            onChange={(valor) => alterarDado(secao.detalheCampo, valor)}
            textarea
            placeholder="Informe nomes, datas, doses, áreas, produtos e intercorrências quando aplicável."
          />
        </details>
      ))}

      <details className="clinical-section" open>
        <summary>
          <span>Avaliação profissional</span>
          <small>Registro objetivo da avaliação, decisão clínica e orientações.</small>
        </summary>
        <div className="clinical-measurements">
          <label>
            <span>Fototipo de Fitzpatrick</span>
            <select className="form-select" value={dados.fototipoFitzpatrick || ""} onChange={(event) => alterarDado("fototipoFitzpatrick", event.target.value)}>
              <option value="">Não avaliado</option>
              <option value="I">I</option><option value="II">II</option><option value="III">III</option>
              <option value="IV">IV</option><option value="V">V</option><option value="VI">VI</option>
            </select>
          </label>
          <CampoTexto label="Tipo/condição da pele" value={dados.tipoPele} onChange={(valor) => alterarDado("tipoPele", valor)} />
          <CampoTexto label="Pressão arterial" value={dados.pressaoArterial} onChange={(valor) => alterarDado("pressaoArterial", valor)} placeholder="Ex.: 120/80 mmHg" />
          <CampoTexto label="Peso" value={dados.peso} onChange={(valor) => alterarDado("peso", valor)} placeholder="kg" />
          <CampoTexto label="Altura" value={dados.altura} onChange={(valor) => alterarDado("altura", valor)} placeholder="cm" />
        </div>
        <div className="clinical-fields-grid">
          <CampoTexto label="Avaliação da pele/área" value={dados.avaliacaoPele} onChange={(valor) => alterarDado("avaliacaoPele", valor)} textarea />
          <CampoTexto label="Achados objetivos do exame" value={dados.achadosExame} onChange={(valor) => alterarDado("achadosExame", valor)} textarea />
        </div>
        <label className="clinical-risk-field">
          <span>Classificação após avaliação profissional</span>
          <select className="form-select" value={dados.classificacaoRisco || "nao_avaliado"} onChange={(event) => alterarDado("classificacaoRisco", event.target.value)}>
            <option value="nao_avaliado">Não avaliado</option>
            <option value="sem_alertas">Sem alertas identificados nesta avaliação</option>
            <option value="atencao">Prosseguir somente após avaliação dos alertas</option>
            <option value="adiar">Adiar procedimento</option>
            <option value="encaminhar">Encaminhar para avaliação médica</option>
          </select>
        </label>
        <div className="clinical-fields-grid">
          <CampoTexto label="Conduta e justificativa profissional" value={dados.condutaProfissional} onChange={(valor) => alterarDado("condutaProfissional", valor)} textarea />
          <CampoTexto label="Orientações pré-procedimento" value={dados.orientacoesPreProcedimento} onChange={(valor) => alterarDado("orientacoesPreProcedimento", valor)} textarea />
          <CampoTexto label="Exames ou encaminhamentos" value={dados.examesEncaminhamentos} onChange={(valor) => alterarDado("examesEncaminhamentos", valor)} textarea />
          <CampoTexto label="Observações adicionais" value={ficha.observacoes} onChange={(valor) => alterarFicha("observacoes", valor)} textarea />
        </div>
        <div className="clinical-confirmation">
          <span>Informações conferidas com a paciente?</span>
          <div className="clinical-segmented" role="group" aria-label="Informações conferidas com a paciente">
            <button type="button" className={dados.informacoesConferidas === "sim" ? "active" : ""} onClick={() => alterarDado("informacoesConferidas", "sim")}>Sim</button>
            <button type="button" className={dados.informacoesConferidas === "nao" ? "active" : ""} onClick={() => alterarDado("informacoesConferidas", "nao")}>Não</button>
          </div>
        </div>
      </details>
    </div>
  );
}
