import { useCallback, useEffect, useRef, useState } from "react";

const secoes = ["dados", "servicos", "consumos"];
const serializar = valor => JSON.stringify(valor);
const copiar = valor => JSON.parse(serializar(valor));

export default function useAutosaveAtendimento({ valor, habilitado, salvarSecao, validar }) {
  const atual = useRef({ valor, habilitado, salvarSecao, validar });
  atual.current = { valor, habilitado, salvarSecao, validar };
  const salvo = useRef(null);
  const emCurso = useRef(null);
  const timer = useRef(null);
  const montado = useRef(true);
  const [estado, setEstado] = useState({ tipo: "salvo", mensagem: "Salvo automaticamente" });

  const informar = useCallback(proximo => {
    if (montado.current) setEstado(proximo);
  }, []);

  const inicializar = useCallback(dados => {
    window.clearTimeout(timer.current);
    salvo.current = copiar(dados);
    informar({ tipo: "salvo", mensagem: "Salvo automaticamente" });
  }, [informar]);

  const pendente = useCallback(() => {
    const { valor: dados, habilitado: permitido } = atual.current;
    return permitido && dados?.id && salvo.current?.id === dados.id &&
      secoes.some(secao => serializar(dados[secao]) !== serializar(salvo.current[secao]));
  }, []);

  const salvar = useCallback(async () => {
    window.clearTimeout(timer.current);
    if (emCurso.current) return emCurso.current;
    if (!pendente()) return true;

    const executar = async () => {
      try {
        // Uma única fila impede que uma resposta antiga sobrescreva a edição recente.
        while (pendente()) {
          const snapshot = copiar(atual.current.valor);
          const erro = atual.current.validar(snapshot);
          if (erro) throw new Error(erro);
          informar({ tipo: "salvando", mensagem: "Salvando…" });
          for (const secao of secoes) {
            if (serializar(snapshot[secao]) === serializar(salvo.current[secao])) continue;
            await atual.current.salvarSecao(secao, snapshot);
            salvo.current = { ...salvo.current, [secao]: snapshot[secao] };
          }
        }
        informar({ tipo: "salvo", mensagem: "Salvo automaticamente" });
        return true;
      } catch (erro) {
        const resposta = erro.response?.data;
        const mensagem = typeof resposta === "string" ? resposta : erro.response ? "Não foi possível salvar. Tente novamente." : erro.message;
        informar({ tipo: "erro", mensagem: mensagem || "Não foi possível salvar. Tente novamente." });
        return false;
      }
    };
    emCurso.current = executar().finally(() => { emCurso.current = null; });
    return emCurso.current;
  }, [informar, pendente]);

  const versao = serializar(valor);
  useEffect(() => {
    window.clearTimeout(timer.current);
    if (pendente()) {
      if (!emCurso.current) informar({ tipo: "pendente", mensagem: "Alterações pendentes…" });
      timer.current = window.setTimeout(salvar, 800);
    }
    return () => window.clearTimeout(timer.current);
  }, [versao, habilitado, informar, pendente, salvar]);

  useEffect(() => {
    montado.current = true;
    const protegerSaida = evento => {
      if (!pendente() && !emCurso.current) return;
      evento.preventDefault();
      evento.returnValue = "";
    };
    window.addEventListener("beforeunload", protegerSaida);
    return () => {
      montado.current = false;
      window.clearTimeout(timer.current);
      window.removeEventListener("beforeunload", protegerSaida);
    };
  }, [pendente]);

  return { estado, inicializar, salvar };
}
