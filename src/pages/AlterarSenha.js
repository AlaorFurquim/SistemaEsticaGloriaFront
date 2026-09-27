import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import CampoSenha from "../components/CampoSenha";
import { validarNovaSenha } from "../utils/passwordPolicy";
import { useSessao } from "../components/SessaoProvider";
import { rotaInicial } from "../utils/perfis";

export default function AlterarSenha() {
  const { usuario, atualizar } = useSessao();
  const navigate = useNavigate();
  const [senhaAtual, setAtual] = useState(""), [novaSenha, setNova] = useState(""), [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState(""), [salvando, setSalvando] = useState(false);
  async function salvar(event) {
    event.preventDefault(); setErro("");
    const erroSenha = validarNovaSenha(novaSenha);
    if (erroSenha) { setErro(erroSenha); return; }
    if (novaSenha !== confirmacao) { setErro("As novas senhas precisam ser iguais."); return; }
    setSalvando(true);
    try { const { data } = await api.put("/auth/alterar-senha", { senhaAtual, novaSenha }); await atualizar(data); navigate(rotaInicial(data.perfil), { replace: true }); }
    catch (error) { setErro(typeof error.response?.data === "string" ? error.response.data : "Não foi possível alterar sua senha. Tente novamente."); }
    finally { setSalvando(false); }
  }
  return <main className="login-page"><form className="login-card" onSubmit={salvar}>
    <h1>Atualizar senha</h1><p>{usuario?.trocaSenhaObrigatoria ? "Sua senha antiga precisa ser atualizada para continuar." : "Escolha uma senha exclusiva para sua conta."} Use pelo menos 12 caracteres. Você pode usar uma frase longa.</p>
    <CampoSenha label="Senha atual" className="mb-3" required value={senhaAtual} onChange={e => setAtual(e.target.value)} />
    <CampoSenha label="Nova senha" modo="nova" className="mb-3" required value={novaSenha} onChange={e => setNova(e.target.value)} />
    <CampoSenha label="Confirme a nova senha" modo="confirmacao" compararCom={novaSenha} className="mb-3" required value={confirmacao} onChange={e => setConfirmacao(e.target.value)} />
    {erro && <p role="alert" className="text-danger">{erro}</p>}<p>As outras sessões da conta serão encerradas.</p>
    <button className="btn btn-primary w-100" disabled={salvando}>{salvando ? "Salvando…" : "Salvar nova senha"}</button>
  </form></main>;
}
