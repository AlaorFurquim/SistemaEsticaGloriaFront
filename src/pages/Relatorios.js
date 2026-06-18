import { useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { formatarMoeda, formatarDataHora } from "../utils/masks";

export default function Relatorios() {
    const [tipo, setTipo] = useState("vendas");
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [resultado, setResultado] = useState(null);
    const [carregando, setCarregando] = useState(false);

    async function gerar(e) {
        e.preventDefault();
        setCarregando(true);
        setResultado(null);

        try {
            const res = await api.get(`/relatorios/${tipo}`, {
                params: { dataInicio, dataFim }
            });

            setResultado(res.data);
        } finally {
            setCarregando(false);
        }
    }

    async function abrirPdf() {
        const response = await api.get("/relatorios/pdf", {
            params: { tipo, dataInicio, dataFim },
            responseType: "blob"
        });

        const file = new Blob([response.data], {
            type: "application/pdf"
        });

        window.open(URL.createObjectURL(file));
    }

    function imprimir() {
        window.print();
    }

    function tituloRelatorio() {
        switch (tipo) {
            case "vendas":
                return "Relatório de Vendas";
            case "atendimentos":
                return "Relatório de Atendimentos";
            case "comissoes":
                return "Relatório de Comissões";
            case "estoque-baixo":
                return "Relatório de Estoque Baixo";
            case "clientes":
                return "Relatório de Clientes";
            default:
                return "Relatório";
        }
    }

    function registros() {
        if (!resultado) return [];

        if (Array.isArray(resultado)) return resultado;

        return resultado.registros || [];
    }

    return (
        <div>
            <PageHeader
                title="Relatórios"
                subtitle="Acompanhe vendas, atendimentos, comissões, estoque e clientes"
            >
                {resultado && (
                    <button className="btn btn-outline-primary" onClick={abrirPdf}>
                        Imprimir / Salvar PDF
                    </button>
                )}
            </PageHeader>

            <form className="panel mb-3 no-print" onSubmit={gerar}>
                <div className="row g-3">
                    <div className="col-md-3">
                        <label>Tipo de relatório</label>
                        <select
                            className="form-select"
                            value={tipo}
                            onChange={e => {
                                setTipo(e.target.value);
                                setResultado(null);
                            }}
                        >
                            <option value="vendas">Vendas</option>
                            <option value="atendimentos">Atendimentos</option>
                            <option value="comissoes">Comissões</option>
                            <option value="estoque-baixo">Estoque baixo</option>
                            <option value="clientes">Clientes</option>
                        </select>
                    </div>

                    {!["estoque-baixo", "clientes"].includes(tipo) && (
                        <>
                            <div className="col-md-3">
                                <label>Data início</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={dataInicio}
                                    onChange={e => setDataInicio(e.target.value)}
                                />
                            </div>

                            <div className="col-md-3">
                                <label>Data fim</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={dataFim}
                                    onChange={e => setDataFim(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    <div className="col-md-3 d-flex align-items-end">
                        <button className="btn btn-primary w-100" disabled={carregando}>
                            {carregando ? "Gerando..." : "Gerar relatório"}
                        </button>
                    </div>
                </div>
            </form>

            {resultado && (
                <div className="report-page">
                    <div className="report-header">
                        <div>
                            <span>Glória Couto • Estética Avançada</span>
                            <h2>{tituloRelatorio()}</h2>
                            <p>
                                Emitido em {new Date().toLocaleString("pt-BR")}
                            </p>
                        </div>

                        <div className="report-logo">
                            <img src="/logo-gloria.jpeg" alt="Glória Couto" />
                        </div>
                    </div>

                    {resultado.total !== undefined && (
                        <div className="report-summary-grid">
                            <div className="report-card">
                                <span>Quantidade</span>
                                <strong> {resultado.quantidade}</strong>
                            </div>

                            <div className="report-card">
                                <span>Total</span>
                                <strong> {formatarMoeda(resultado.total)}</strong>
                            </div>

                            {resultado.comissoes !== undefined && (
                                <div className="report-card">
                                    <span>Comissões</span>
                                    <strong>{formatarMoeda(resultado.comissoes)}</strong>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="report-table-wrapper">
                        <table className="table report-table">
                            <thead>
                                {tipo === "vendas" && (
                                    <tr>
                                        <th>Data</th>
                                        <th>Cliente</th>
                                        <th>Pagamento</th>
                                        <th className="text-end">Subtotal</th>
                                        <th className="text-end">Desconto</th>
                                        <th className="text-end">Total</th>
                                    </tr>
                                )}

                                {tipo === "atendimentos" && (
                                    <tr>
                                        <th>Data</th>
                                        <th>Cliente</th>
                                        <th>Serviço</th>
                                        <th>Profissional</th>
                                        <th>Status</th>
                                        <th className="text-end">Total</th>
                                        <th className="text-end">Comissão</th>
                                    </tr>
                                )}

                                {tipo === "comissoes" && (
                                    <tr>
                                        <th>Profissional</th>
                                        <th className="text-end">Serviços</th>
                                        <th className="text-end">Total Serviços</th>
                                        <th className="text-end">Comissão</th>
                                    </tr>
                                )}

                                {tipo === "estoque-baixo" && (
                                    <tr>
                                        <th>Produto</th>
                                        <th className="text-end">Estoque</th>
                                        <th className="text-end">Mínimo</th>
                                        <th className="text-end">Preço Venda</th>
                                    </tr>
                                )}

                                {tipo === "clientes" && (
                                    <tr>
                                        <th>Nome</th>
                                        <th>Telefone</th>
                                        <th>Documento</th>
                                        <th>E-mail</th>
                                    </tr>
                                )}
                            </thead>

                            <tbody>
                                {tipo === "vendas" &&
                                    registros().map(x => (
                                        <tr key={x.id}>
                                            <td>{formatarDataHora(x.data)}</td>
                                            <td>{x.cliente}</td>
                                            <td>{x.formaPagamento}</td>
                                            <td className="text-end">{formatarMoeda(x.subtotal)}</td>
                                            <td className="text-end">{formatarMoeda(x.desconto)}</td>
                                            <td className="text-end fw-bold">{formatarMoeda(x.total)}</td>
                                        </tr>
                                    ))}

                                {tipo === "atendimentos" &&
                                    registros().map(x => (
                                        <tr key={x.id}>
                                            <td>{formatarDataHora(x.dataHora)}</td>
                                            <td>{x.cliente}</td>
                                            <td>{x.servico}</td>
                                            <td>{x.profissional}</td>
                                            <td>{x.status}</td>
                                            <td className="text-end fw-bold">{formatarMoeda(x.valorFinal)}</td>
                                            <td className="text-end">{formatarMoeda(x.valorComissao)}</td>
                                        </tr>
                                    ))}

                                {tipo === "comissoes" &&
                                    registros().map((x, index) => (
                                        <tr key={index}>
                                            <td>{x.profissional}</td>
                                            <td className="text-end">{x.quantidade}</td>
                                            <td className="text-end">{formatarMoeda(x.totalServicos)}</td>
                                            <td className="text-end fw-bold">{formatarMoeda(x.totalComissao)}</td>
                                        </tr>
                                    ))}

                                {tipo === "estoque-baixo" &&
                                    registros().map(x => (
                                        <tr key={x.id}>
                                            <td>{x.nome}</td>
                                            <td className="text-end text-danger fw-bold">{x.quantidadeEstoque}</td>
                                            <td className="text-end">{x.estoqueMinimo}</td>
                                            <td className="text-end">{formatarMoeda(x.precoVenda)}</td>
                                        </tr>
                                    ))}

                                {tipo === "clientes" &&
                                    registros().map(x => (
                                        <tr key={x.id}>
                                            <td>{x.nome}</td>
                                            <td>{x.telefone}</td>
                                            <td>{x.documento}</td>
                                            <td>{x.email}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="report-footer">
                        <span>Glória Couto • Estética Avançada</span>
                        <span>Relatório gerado automaticamente pelo sistema.</span>
                    </div>
                </div>
            )}
        </div>
    );
}