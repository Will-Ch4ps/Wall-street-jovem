export interface NewsTemplate {
  id: string
  title: string
  body: string
  expertTip: string
  /** Texto longo a ser exibido no modal/página detalhada. */
  expertDetailedAnalysis: string
  isRumor: boolean
  isRumorTrue?: boolean
  scope: 'global' | 'sector' | 'company' | 'fii'
  category: 'economy' | 'politics' | 'company' | 'sector' | 'fii' | 'crisis' | 'opportunity'
  linkedTickers?: string[]
  linkedSectors?: string[]
  variables: Record<string, string[]>
}

export const newsTemplates: NewsTemplate[] = [
  // ────────────────────────────────────────────────────────
  // GLOBAIS (5)
  // ────────────────────────────────────────────────────────
  {
    id: 'nt_g_selic_sobe',
    scope: 'global', category: 'economy',
    title: 'Copom surpreende e {acao} juros em {valor}',
    body: 'O Banco Central anunciou uma alteração na taxa Selic fora do consenso de mercado, citando pressões inflacionárias no setor de serviços. A curva de juros reagiu e impactou diretamente as empresas de consumo e FIIs de tijolo.',
    expertTip: '🗣️ Estrategista diz: "Tire o pé do acelerador em ativos de risco (Growth) e migre para caixa ou FIIs de Papel." (Risco de rumor exagerado)',
    expertDetailedAnalysis: 'A alta inesperada dos juros promove uma reprecificação imediata de todos os ativos de risco, porque o prêmio livre de risco (renda fixa) se torna muito atraente. O efeito mais nocivo se dá em (1) Empresas alavancadas em dívida pós-fixada como a AeroViagem (AERV3); (2) Empresas de varejo não essencial, já que o consumo das famílias cai; e (3) Fundos Imobiliários de Tijolo, que perdem atratividade frente à renda fixa. Esse efeito durará em média 5 rodadas até o mercado absorver. Alunos posicionados em Caixa ou Fundo DI estão ilesos.',
    isRumor: true,
    variables: { acao: ['eleva os'], valor: ['0.50 p.p.', '1.00 p.p.', '0.75 p.p.'] }
  },
  {
    id: 'nt_g_dolar_cai',
    scope: 'global', category: 'economy',
    title: 'Real se fortalece: Dólar fecha em queda de {percentual}',
    body: 'A forte entrada de fluxo de capital estrangeiro na B3 fez a moeda americana desabar hoje. O movimento beneficia empresas que têm alto custo em dólar e prejudica as exportadoras.',
    expertTip: '🗣️ A dica é: "Fuja do Agro Focado em Exportação e compre varejo interno." (Rumor quente)',
    expertDetailedAnalysis: 'Essa é uma das janelas de oportunidade mais claras do mercado. O dólar fraco (câmbio valorizado) é uma pancada nas exportadoras de commodities como AgroForte (AGFT3), PetroMax (PMAX3) e BoiGlobal (FRIG3), pois suas receitas em reais caem. Em contrapartida, é o alívio que empresas afogadas em dívidas dolarizadas e insumos cotados em dólar esperavam: AeroViagem (AERV3) economiza muito com querosene. Esse pulso de alta deve durar de 2 a 3 rodadas.',
    isRumor: true,
    variables: { percentual: ['2,5%', '3,0%', '4,1%'] }
  },
  {
    id: 'nt_g_ibovespa_topo',
    scope: 'global', category: 'economy',
    title: 'Ibovespa renova máxima histórica aos {pontos}',
    body: 'Em clima de euforia contagiante, a bolsa paulista atinge patamares inéditos. Investidores pessoas físicas entram em peso no mercado, gerando forte volume financeiro.',
    expertTip: '🗣️ Análise: "Cuidado com o over-trade. Se todo mundo compra, quem vai vender? Correções bruscas virão." (Fato inquestionável)',
    expertDetailedAnalysis: 'Em euforia máxima, as ações "beta-alto" (muito voláteis) exageram no movimento, como ByteRise (BRIS3) e FinTechPay (FTPY3). Contudo, a grande vencedora estrutural de um mercado bull é a corretora, InvestCorp (INVS3), porque ela lucra independentemente se o cliente ganha ou perde — ela cobra taxa sobre o giro. A corretora é onde o dinheiro real fica em bull markets longos.',
    isRumor: false,
    variables: { pontos: ['130.000 pts', '140.000 pts', '150.000 pts'] }
  },
  {
    id: 'nt_g_esg_boom',
    scope: 'global', category: 'opportunity',
    title: 'Fundos Globais despejam bilhões em portfólios {tag_esg}',
    body: 'Movimento coordenado pela ONU redirecionou rios de dinheiro para mercados emergentes que respeitam limites de carbono e governança.',
    expertTip: '🗣️ Insider diz: "Empresas com o selo ESG dispararão amanhã." (Possível boato antecipado do mestre)',
    expertDetailedAnalysis: 'Neste cenário, todo capital institucional internacional ignora análise fundamentalista dura de P/L e compra apenas ativos autorizados ("compliance verde"). A EnergiaVerde (ENVD3) está perfeitamente alinhada e as compras massivas por robôs deslocarão seu preço nas próximas rodadas. Fique atento: Empresas percebidas como "sujas" enfrentarão forte saída de fundos gringos.',
    isRumor: true,
    linkedSectors: ['Energia'],
    variables: { tag_esg: ['Verdes', 'Sustentáveis', 'ESG'] }
  },
  {
    id: 'nt_g_crise_bancaria',
    scope: 'global', category: 'crisis',
    title: 'Crise de Crédito: Risco de Insolvência Assusta o Mercado',
    body: 'A inadimplência generalizada nas famílias atinge pico histórico de {inad_pct}. O crédito secou da noite para o dia, forçando uma aversão violenta ao risco na bolsa.',
    expertTip: '🗣️ Alerta: "Saia do consumo agora! Foque apenas no necessário, como saúde, e energia da base." (Fato comprovado)',
    expertDetailedAnalysis: 'O "Credit Crunch" (Restrição de Crédito) mata o sistema capitalista pela base. Se o BancoSólido (BSOL3) cortar limites de cartão e financiamentos, os consumidores deixam de comprar na MercaFácil (MCFC3). O lucro do varejo desaba e a empresa fica sem dinheiro para expandir. Pior ainda: as startups que não dão lucro (ByteRise, FinTechPay) correm sério risco de falência em 5 rodadas se não conseguirem empréstimos. Refúgio na NuclearBR (NUCL3) e VidaSaúde (VSAU3).',
    isRumor: false,
    linkedSectors: ['Financeiro', 'Consumo'],
    variables: { inad_pct: ['8%', '12%', '14%'] }
  },

  // ────────────────────────────────────────────────────────
  // SETORIAIS (8)
  // ────────────────────────────────────────────────────────
  {
    id: 'nt_s_tech_ia',
    scope: 'sector', category: 'sector',
    title: 'A nova onda de IA: {termo} atrai os fundos Silicon Valley',
    body: 'Grandes avanços em Modelos de Linguagem geram furor no Vale do Silício, com respingos no mercado local. Setor de tecnologia ganha momentum.',
    expertTip: '🗣️ Dica da Faria Lima: "O crescimento futuro é incalculável. Compre no boato, venda no fato." (Rumor de especulador)',
    expertDetailedAnalysis: 'A narrativa de IA é a mais forte no mercado. Não importa se a ByteRise (BRIS3) não tem lucro; o mercado paga o sonho (Growth puro). Para a TechNova (TNOV3), que vende cloud, isso representa um boom gigante na venda de espaço ocioso de servidores (B2B). Espere volatilidade de até 30% pra cima.',
    isRumor: true,
    linkedSectors: ['Tecnologia'],
    variables: { termo: ['AGI', 'Machine Learning', 'Computação Quântica'] }
  },
  {
    id: 'nt_s_tech_cyber',
    scope: 'sector', category: 'crisis',
    title: 'Vazamento Massivo expõe dados de {pessoas} brasileiros',
    body: 'A invasão a um banco de dados unificado colocou a cibersegurança do país em xeque. Empresas de infraestrutura e proteção de dados disparam na bolsa.',
    expertTip: '🗣️ Análise Técnica: "A DigiCore passará todos os topos anteriores na próxima semana." (Fato inconteste)',
    expertDetailedAnalysis: 'Pânico Institucional: Bancos e varejistas correm para assinar os serviços milionários da DigiCore (DGCR3). A percepção imediata do mercado é que os lucros futuros da DigiCore dobraram durante a noite. Essa é uma notícia com ciclo curto: o mercado compra forte hoje, mas em 3 rodadas o susto passa e a ação lateraliza.',
    isRumor: false,
    linkedSectors: ['Tecnologia'],
    variables: { pessoas: ['40 milhões', '120 milhões', '200 milhões'] }
  },
  {
    id: 'nt_s_agro_chuvas',
    scope: 'sector', category: 'sector',
    title: 'La Niña causa estragos no Sul e favorece colheita no Centro-Oeste',
    body: 'O clima está bizarro. Enquanto plantações no Rio Grande do Sul ficam debaixo d’água, a soja plantada em Mato Grosso atinge patamar recorde de produtividade.',
    expertTip: '🗣️ Boato do Corretor de Grãos: "Metade da safrinha quebrou. A soja vai passar de R$200 o saco." (Rumor especulativo absurdo)',
    expertDetailedAnalysis: 'O Agro brasileiro nunca reage igualitariamente às chuvas. A quebra parcial do Sul significa que a soja colhida em MT pela AgroForte (AGFT3) valerá 40% a mais na bolsa de Chicago amanhã. Ao mesmo tempo, o frigorífico BoiGlobal (FRIG3) vai sangrar: vacas mortas no alagamento do sul reduzem a oferta e inflam o custo do processamento. É um Trade Perfeito de Pairs (Compre AGFT3, Venda Descoberto FRIG3).',
    isRumor: true,
    linkedSectors: ['Agro'],
    variables: { dummy: [''] }
  },
  {
    id: 'nt_s_agro_tratores',
    scope: 'sector', category: 'opportunity',
    title: 'BNDES anuncia programa subsidiado de {valor} para modernização 5G no Campo',
    body: 'Com juros abaixo da inflação (subsídio federal), grandes fazendeiros têm a faca e o queijo na mão para trocar frotas antigas por colheitadeiras e equipamentos autônomos.',
    expertTip: '🗣️ Insider do BNDES: "Acabou os tratores no pátio. A demanda está fora do escopo." (Rumor quase Confirmado)',
    expertDetailedAnalysis: 'Dinheiro fácil subsidiado sempre gera picos de demanda. A TerraTech (TRTR3), sendo a fabricante automatizada de ponta, não tem estoques. Os contratos faturados para as próximas 4 rodadas garantirão um P/L muito convidativo. O impacto se reflete em dividendos extraordinários muito em breve.',
    isRumor: true,
    linkedSectors: ['Agro'],
    variables: { valor: ['R$ 10 Bilhões', 'R$ 25 Bilhões'] }
  },
  {
    id: 'nt_s_saude_pandemia',
    scope: 'sector', category: 'crisis',
    title: 'Ministério da Saúde decreta estado de emergência para Vírus X',
    body: 'Os leitos estão esgotados e as UTIs sofrem colapso regional. Corrida às farmácias zera estoques de analgésicos e máscaras nas metrópoles.',
    expertTip: '🗣️ Dica Obscura: "Alguém aí tá ganhando a rodo enquanto o povo adoece." (Fato de Cíclos)',
    expertDetailedAnalysis: 'Aqui o mercado é cruel, mas racional financeiramente: A VidaSaúde (VSAU3) fatura dezenas de milhões no desespero de prevenção da base. Porém, quem mais sofre é a RedeHosp (HOSP3) — A ilusão de que hospital fatura na pandemia é falsa, pois eles são forçados a cancelar as "cirurgias eletivas" caras (plásticas, coração) para internar pacientes graves (UTI tem margem muito menor). VidaSaúde = Compra forte; RedeHosp = Venda.',
    isRumor: false,
    linkedSectors: ['Saúde'],
    variables: { dummy: [''] }
  },
  {
    id: 'nt_s_fin_openbank',
    scope: 'sector', category: 'opportunity',
    title: 'Open Banking e Drex quebram o oligopólio dos bancões',
    body: 'O BC impõe portabilidade ágil de crédito em 1 minuto. Clientes descobrem que pagar 300% de cheque especial no bancão é coisa do passado e migram o salário.',
    expertTip: '🗣️ Analista Tech: "O BSOL3 está velho. A FinTechPay vai engolir a carteira deles no Q3." (Rumor arrojado)',
    expertDetailedAnalysis: 'O "ataque das fintechs". Historicamente, a FinTechPay (FTPY3) não dá lucro, mas neste cenário, a taxa de adoção e conversão cresce a duplo dígito semanal. Se o aluno quiser lucro rápido, compra FTPY3; entretanto, a longo prazo, o BancoSólido (BSOL3) sempre compra as fintechs menores, mas no jogo curto das rodadas, a ação dele afunda por perda de comissão e rentabilidade recorrente de crédito caro.',
    isRumor: true,
    linkedSectors: ['Financeiro'],
    variables: { dummy: [''] }
  },
  {
    id: 'nt_s_mobil_combustivel',
    scope: 'sector', category: 'crisis',
    title: 'ICMS e Petrobras não chegam em acordo: Gasolina e Querosene disparam',
    body: 'Após greve paralela nas refinarias, a distribuição no Sudeste é paralisada temporariamente. Aviões ficam no chão e locadoras seguram revisões e vendas de frota.',
    expertTip: '🗣️ Operador do Porto de Santos: "A corda vai estourar pro lado das operadoras aéreas." (Fato matemático)',
    expertDetailedAnalysis: 'O pesadelo do transporte no Brasil é quando a cadeia logística quebra. A AeroViagem (AERV3) usa capital de giro gigante apenas pra encher os tanques dos aviões de querosene; se essa equação não fecha 1 semana, a ação derrete à beira da recuperação judicial. Para a RotaLivre (MOVB3), a alta desmotiva locatários de app (Uber), aumentando a devolução de frota e derrubando a cotação pelas próximas duas ou três rodadas.',
    isRumor: false,
    linkedSectors: ['Mobilidade'],
    variables: { dummy: [''] }
  },
  {
    id: 'nt_s_consumo_varejo',
    scope: 'sector', category: 'sector',
    title: 'Batalha pela Isenção dos 50 Dólares',
    body: 'Câmara derruba veto e volta a isentar as brusinhas importadas de impostos abusivos da China. O e-commerce volta a sorrir na cara do varejo local.',
    expertTip: '🗣️ Rumor Presidencial: "Vai passar sem veto. Pode comprar a tech chinesa que é gol." (Rumor)',
    expertDetailedAnalysis: 'Essa é a sentença de morte da margem da MercaFácil (MCFC3). Ninguém no atacarejo consegue bater o preço subsidiado pela mega-estrutura e margem sub-zero da OnlineShop (ONLS3). Essa guerra de preços joga a ONLS3, que vinha caindo, no topo dos trends por especulação. O consumo local apanha severamente. Fique até 4 rodadas long.',
    isRumor: true,
    linkedSectors: ['Consumo'],
    variables: { dummy: [''] }
  },

  // ────────────────────────────────────────────────────────
  // MICRO / EMPRESA ESPECÍFICAS (8)
  // ────────────────────────────────────────────────────────
  {
    id: 'nt_c_ipo_geral',
    scope: 'company', category: 'company',
    title: 'IPO Cativante: {empresa} abre capital no auge do Bull Market',
    body: 'Houve overbook (demanda 10x maior que a oferta de ações)! Investidores institucionais brigaram por fatias dessa empresa do segmento de {setor}. A festa no sino da B3 foi memorável.',
    expertTip: '🗣️ Gestor do Fundo Top: "O valuation do IPO (oferta pública) foi R$ {oferta}. Deve bater R$ {surto} no leilão." (Rumor Histórico de IPO no Brasil)',
    expertDetailedAnalysis: 'Sempre que você tem o evento "IPO", significa "Compra Cega Rápida". Os Bancos estruturadores travam a venda ("Lock Up") nos primeiros dias, com falta de ações, o preço simplesmente sobe 20% com muita facilidade. Na rodada em que aparecer o Evento Global IPO, olhe rápido o alvo e compre a mercado. Saia logo depois (em 1-2 rodadas) porque o tombo do fundo vendendo em bloco é gigantesco.',
    isRumor: true,
    linkedTickers: ['TNOV3', 'BRIS3', 'DGCR3', 'ENVD3', 'PMAX3', 'NUCL3', 'MCFC3', 'LUXM3', 'ONLS3', 'BSOL3', 'FTPY3', 'INVS3', 'VSAU3', 'BLAB3', 'HOSP3', 'AGFT3', 'FRIG3', 'TRTR3', 'AERV3', 'MOVB3', 'HOTE3'],
    variables: {
      empresa: ['Uma Gigante Oculta', 'A Promessa Setorial'],
      setor: ['Tecnologia', 'Saúde', 'Consumo', 'Agronegócio', 'Energia', 'Mobilidade'],
      oferta: ['15', '20'],
      surto: ['22', '35']
    }
  },
  {
    id: 'nt_c_fusao_tn_bris',
    scope: 'company', category: 'company',
    title: 'TechNova em via-rápida de comprar ByteRise!',
    body: 'Vazamento da sala de diretores aponta que TNOV3 assinou MOU de confidencialidade para anexar toda patente em IA da BRIS3 sob sua marca cloud.',
    expertTip: '🗣️ Aposta Secreta: "A comprada sobe o prêmio, a compradora sofre diluição." (Fato da engenharia financeira)',
    expertDetailedAnalysis: 'Na "Dança das Cadeiras" de Fusões (M&A): O alvo da aquisição, ByteRise (BRIS3), receberá muito mais por ação para os donos concordarem, por isso a ação BRIS3 dispara (alvo +30%). Contudo, a gigante fechando (TechNova TNOV3) vai precisar tomar dívida para pagar bilhões de uma vez, isso apavora seu acionista que vende (alvo TNOV3 -5%). Compre rápido o Alvo Inovador!',
    isRumor: false,
    linkedTickers: ['TNOV3', 'BRIS3'],
    variables: { dummy: [''] }
  },
  {
    id: 'nt_c_fraude_mcfc',
    scope: 'company', category: 'crisis',
    title: 'Rombo CVM em MercaFácil Manda Presidente para Cadeia',
    body: 'Um Whistleblower interno soltou pen-drives à Folha documentando fraudes nas receitas tributárias por 4 trimestres seguidos. PF faz operação na sede.',
    expertTip: '🗣️ Opinião Forense: "MCFC3 vai ao chão, mas as de luxo puxam os fundos institucionais do setor pra equilibrar." (Rumor de Arbitragem)',
    expertDetailedAnalysis: 'Evento Binário de Cauda Escura que destrói CPF de aluno otimista (Sunk Cost Fallacy). A MercaFácil (MCFC3) pode perder até 70% de Valor de Mercado em "Gaps de Leilão" e ser banida do IBOV. Por estar em Liquidação Forçada (os Fundos de Previdência e Ações são OBRIGADOS na Lei a zerar posições), o impacto final é que a MercaFácil apanha duramente e a LuxMart (LUXM3), livre do drama, atrai esse dinheiro (Fly to Quality). Venda Descoberto (Short) na MCFC3 se puder!',
    isRumor: true,
    linkedTickers: ['MCFC3', 'LUXM3'],
    variables: { dummy: [''] }
  },
  {
    id: 'nt_c_petromax_achado',
    scope: 'company', category: 'company',
    title: 'PetroMax acha bacia colossal no Litoral Sudeste!',
    body: 'Anúncio solene: Poço recem-perfurado comprova provisão superior a do famoso pré-sal, quebrando tudo que havia em modelagem matemática e financeira a PMAX3.',
    expertTip: '🗣️ Petroleiro em Off: "Não olhem apenas a empresa, a Nuclear sofre fuga massiva de investidores perante isso." (Fato do Equilíbrio do Mercado)',
    expertDetailedAnalysis: 'Quando do dia pra noite uma petroleira, PetroMax (PMAX3), diz que pode bombear 5x mais crú barato por ano, todo modelo de preço do futuro derrete pra cima. As ações sobem +50% logo e puxam indexação do setor. O curioso aqui de ensinar é o Risco Político Latente. Quanto mais brilha a estatal, mais a mão forte governamental planeja usar dela. Como todo dinheiro do Setor de Energia corre para PMAX3, o investidor esvazia a sua concorrente NuclearBR (NUCL3).',
    isRumor: false,
    linkedTickers: ['PMAX3', 'NUCL3'],
    variables: { dummy: [''] }
  },
  {
    id: 'nt_c_luxmart_expansao',
    scope: 'company', category: 'opportunity',
    title: 'Boutique Global Anuncia Invasão no Portfólio LuxMart',
    body: 'Acordo com a LVMH concede exclusividade por 30 anos no repasse da marca Dior para as franqueadas do portifolio LuxMart na América Latina. O luxo é Imune!',
    expertTip: '🗣️ Elite Social Media: "Eles operam acima das críticas. Podem cobrar o que quiserem." (O Rumor de Elasticidade)',
    expertDetailedAnalysis: 'Varejo premium (Luxury) opera com margens absurdas e pouca sensibilidade à dor econômica base (o rico não economiza em Dior). Quando a LuxMart (LUXM3) recebe o privilégio de exclusividade e royalties, o Valuation sobe absurdamente por prever Recorrência + Escala de Bilhões. Compre e espere o longo prazo render frutos com dividendos anuais de marca registrada.',
    isRumor: true,
    linkedTickers: ['LUXM3'],
    variables: { dummy: [''] }
  },
  {
    id: 'nt_c_onlineshop_queima',
    scope: 'company', category: 'crisis',
    title: 'Desistência de Acionistas na OnlineShop',
    body: 'Bilionário detentor de 20% das ações jogou a toalha hoje: Anunciou emissão secundária (venda pesada da cota dele a preço descontado) por descrença na gestão.',
    expertTip: '🗣️ A Regra do Bloqueio: "Se o tubarão quer pular fora do barco pelo preço de banana do vizinho, não é o aluno bobo que vai comprar." (Fato de Institucional)',
    expertDetailedAnalysis: 'O "Follow-On Secundário" para fuga de controlador é péssimo. Se o maior interessado no bem diz "não quero mais com 15% de deságio da tela", a tela não valia nada. As sardinhas (alunos da turma pequena) não devem comprar o tombo achando ser oportunidade. Esse é um short play em OnlineShop (ONLS3) perfeitamente validado.',
    isRumor: false,
    linkedTickers: ['ONLS3'],
    variables: { dummy: [''] }
  },
  {
    id: 'nt_c_biolab_sucesso',
    scope: 'company', category: 'opportunity',
    title: 'Fase 3 do FDA concluída maravilhosamente pela BioLab!',
    body: 'Foram três anos de ensaios e sigilo. Mas hoje, a agência protetora assinou o "GO". Farmácia biológica explode o lucro em potencial.',
    expertTip: '🗣️ Risco de Operador de Mesa: "Ou sobe 100% ou perde tudo que o Fundo Aplicou." (O Rumor Binário Ganhador)',
    expertDetailedAnalysis: 'Farmacêuticas R&D (Pesquisa) vivem a "Roleta Russa" legalizada. O papel de BLAB3 não tem preço-teto agora porque deter uma patente de cura tem valor infinito. É o Boom esperado. As ações chegam a entrar em Circuit Breaker para cima. Mas seja ágil: essas subidas criam um vácuo no final de 2-3 rodadas onde o repasse dos laboratórios aos investidores demora.',
    isRumor: true,
    linkedTickers: ['BLAB3'],
    variables: { dummy: [''] }
  },
  {
    id: 'nt_c_bsol_lucro',
    scope: 'company', category: 'company',
    title: 'BancoSólido Apresenta Lucro Estupidamente Obsceno',
    body: 'R$ 7 Bilhões não é faturamento. É o Lucro LÍQUIDO do trimestre. Analistas atônitos sobre a geração da máquina financeira brasileira de Spread eterno.',
    expertTip: '🗣️ Bancário Analista: "Eles pagam o JCP na sexta sem falta de mais de 10% no Preço da Tela." (Fato de Rentista de Papel)',
    expertDetailedAnalysis: 'Nada supera os maiores bancos do país no quesito Proteção Defensiva em cenário neutro/ruim de mundo e bom de tela. O BSOL3 não só subirá consistentemente nessa rodada; o prêmio maior está em reter o papel e embolsar a mega bonificação/dividendo em tela, ensinando os alunos a ver o rendimento caindo nas costas do extrato quando o JCP for liberado antes do round acabar.',
    isRumor: false,
    linkedTickers: ['BSOL3'],
    variables: { dummy: [''] }
  },

  // ────────────────────────────────────────────────────────
  // FIIS (4)
  // ────────────────────────────────────────────────────────
  {
    id: 'nt_fii_logistica_amazon',
    scope: 'fii', category: 'fii',
    title: 'Pólos da Logística Zero-Vacância Ocupados pela E-commerce Gringa',
    body: 'Empresões de tecnologia internacional esgotam andares industriais de Minas Gerais. O fundo logístico repassa aumentos agressivos e zera a vacância com inquilino triplo AAA.',
    expertTip: '🗣️ Imobiliário SP: "Cota de tijolo sobe mais devagar, mas esse prêmio será absurdo na distribuição!" (O Rumor Rentável)',
    expertDetailedAnalysis: 'A LOGI11 (FII Logístico AAA) vai entregar um mês glorioso. Zerou a vacância. Isso quer dizer duas coisas para o aluno: Primeiro, a cota principal sobre pela re-avaliação do P/VP que sobe sem parar, então quem comprou a cota a 90 vai ver ela testar os 105. Segundo: os Dividendos Mensais aumentarão mais de 15% líquido. Renda passiva no estado da arte.',
    isRumor: true,
    linkedTickers: ['LOGI11'],
    variables: { dummy: [''] }
  },
  {
    id: 'nt_fii_corp_abandono',
    scope: 'fii', category: 'crisis',
    title: 'Gigante da Faria Lima Devolve 6 Andares em Lajes SP',
    body: 'Como política remanescente do Home-office, as sedes esvaziam nas posições de Back-office. E o rombo cai no colo do Fundo e dos seus investidores na perda gigantesca.',
    expertTip: '🗣️ Especulador de Escritório: "Corra disso agora." (Fato inarrável de prejuízo)',
    expertDetailedAnalysis: 'Laje Corporativa é um terror da Vacância Carga-Fixa. A CORP11 (CorpTower) passa a receber zero de 6 lajes de SP. Só que os condomínios caríssimos do prédio devem ser bancados por alguém. E será pelo fundo. Isso drena a Receita, e o Dividendo mensal do Aluno é sumariamente engolido. Venda rápido e aloque o capital perdido no IPCA Fix (PAPF11) ou perca por taxa inerte.',
    isRumor: false,
    linkedTickers: ['CORP11'],
    variables: { dummy: [''] }
  },
  {
    id: 'nt_fii_papel_default',
    scope: 'fii', category: 'crisis',
    title: 'Calote Imóvel de Risco: HighYield Leva Bordoada Criminosa',
    body: 'Dois complexos hoteleiros no resort que pagavam juros altíssimos pela agiotagem imobiliária do CRI deram "Judicial". O fundo perde sua receita massiva principal.',
    expertTip: '🗣️ A piada das corretoras: "Dividend Yield de 18% era arriscado demais pra estar sem perdas, a conta chegou." (Rumor da Crise de Crédito)',
    expertDetailedAnalysis: 'O fundo CRI HighYield (HGLG11) ensinava FII a pagar uma mina de ouro falsa em DY. Como apostavam muito o capital investindo em CRI lixo com prêmios por fora. O risco bate à porta, eles tomam "Default". O fundo marca a mercado o papel pro buraco (P/VP e Cota derretem 20%), e os juros recebidos vão a zero. Esse é o momento "Aprendizado do Risco/Retorno" fatal do Fundo.',
    isRumor: true,
    linkedTickers: ['HGLG11'],
    variables: { dummy: [''] }
  },
  {
    id: 'nt_fii_ipca_juros',
    scope: 'fii', category: 'opportunity',
    title: 'Inflação Persistente Engorda Distribuição PapelFix (CRIs Seguros)',
    body: 'Com o IBGE batendo no teto a inflação dos combustíveis. O fundo de PapelFix atrelado totalmente ao repasse da inflação + margem bate metas de receita de um ano sem esforço.',
    expertTip: '🗣️ Dica Mestra FII: "Ação sofreu com Juros e Inflação, O PapelFix se Empoderou. Proteção ativa Pura!" (A Estratégia dos Sobreviventes)',
    expertDetailedAnalysis: 'A beleza dos CRIs atrelados a IPCA (PAPF11). Enquanto toda a bolsa caia pelos efeitos do IPCA rasgar o PIB Nacional, esse fundo literalmente vive disso. O aluno que entende do Hedge Financeiro comprou PAPF11 e terá rentabilidade de IPCA + 7%, o fundo sobe, o dividendo multiplica, ele ri de fora dos players operando a MercaFácil da vida.',
    isRumor: false,
    linkedTickers: ['PAPF11'],
    variables: { dummy: [''] }
  }
]
