import { Container, Typography, Box, Accordion, AccordionSummary, AccordionDetails, Link } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export default function Regulamento() {
    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
                Regulamento GAV
            </Typography>

            {/* 1. INTRODUÇÃO E FILOSOFIA */}
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                        1. INTRODUÇÃO E FILOSOFIA
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography paragraph>
                        Somos um grupo de amigos que têm um interesse em comum – Automobilismo.
                    </Typography>
                    <Typography paragraph>
                        A principal característica da Guerreiros do AV, que nos diferencia de outras ligas do automobilismo virtual, é a nossa busca constante em trazer aos pilotos virtuais a física mais real e compatível com o carro, disponibilizando alguns dos melhores conteúdos do AV. Nosso trabalho sobre a física dos carros é feito utilizando as especificações técnicas reais e tendo apoio em testes realizados por pilotos das categorias reais. Além do comprometimento de proporcionar campeonatos de diversas categorias, com acerto de BoP (Balance of Performance) dos carros, lastros ou restritores (para igualar as disputas entre os níveis dos pilotos) e variação de clima durante a prova.
                    </Typography>
                    <Typography paragraph>
                        Aqui a competição tem limites: corre-se respeitando o espaço dos outros tanto na pista quanto fora dela, com respeito e amizade acima de tudo.
                    </Typography>
                    <Typography paragraph>
                        O automobilismo virtual, como modalidade esportiva, teve um crescimento exponencial nos últimos anos, principalmente no momento de pandemia, sendo uma das portas de entrada para quem ama estar atrás de um volante, visto que, para se destacar e construir uma carreira, não é necessário um alto investimento, como no automobilismo real.
                    </Typography>
                </AccordionDetails>
            </Accordion>

            {/* 2. O SIMULADOR E REQUISITOS TÉCNICOS */}
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                        2. O SIMULADOR E REQUISITOS TÉCNICOS
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography paragraph>
                        Será utilizado o Assetto Corsa, através de seus conteúdos (DLC) ou MOD, dentre outros arquivos ou aplicativos necessários, disponibilizados pela administração, para o correto andamento dos campeonatos.
                    </Typography>
                    <Typography paragraph>
                        É obrigatório o uso de todos arquivos solicitados previamente durante a fase de divulgação e fase que decorre o campeonato, para que possamos garantir uma melhor experiência aos competidores. Caso não tenha instalado algum dos itens informados, o piloto corre o risco de ser removido (automaticamente) ao tentar ingressar no servidor.
                    </Typography>
                    <Typography paragraph>
                        É de total responsabilidade do piloto certificar-se que todos os arquivos, apps e conteúdos foram instalados corretamente dias antes das etapas dos campeonatos, problemas individuais no momento de virada da seção não implicarão em reset obrigatório do servidor.
                    </Typography>
                    <Typography paragraph>
                        A administração não se responsabiliza pelo piloto que não conseguir entrar nos servidores horas ou minutos antes de começar as etapas, sendo desclassificado da etapa sem direito a recurso.
                    </Typography>
                    <Typography paragraph>
                        A Liga Guerreiros do AV não se responsabiliza por falhas ou instabilidade de conexão quando esta não partir de nossos servidores, sendo assim, não constituindo impugnação ou benefício ao piloto ou da etapa.
                    </Typography>
                </AccordionDetails>
            </Accordion>

            {/* 3. INSCRIÇÕES */}
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                        3. INSCRIÇÕES
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography paragraph>
                        Qualquer piloto que tenha o simulador Assetto Corsa que seja original pela Steam pode se inscrever nos campeonatos.
                    </Typography>
                    <Typography paragraph>
                        Não será permitido apelidos, nomes mistos com números ou outro caractere, você deverá usar o primeiro nome e um sobrenome.
                    </Typography>
                    <Typography paragraph>
                        A participação será confirmada após a inscrição no site com sua Steam ID, o pagamento da taxa e o preenchimento do formulário (Forms) enviado individualmente a cada participante.
                    </Typography>
                    <Typography paragraph>
                        Após a confirmação da inscrição, não realizamos reembolso da taxa, fica sob responsabilidade do piloto avaliar sua disponibilidade e se organizar nas datas das etapas. Casos excepcionais serão estudados individualmente.
                    </Typography>
                    <Typography paragraph>
                        A taxa de inscrição é destinada ao pagamento das transmissões e premiação quando descrito na divulgação dos campeonatos.
                    </Typography>
                    <Typography paragraph>
                        O número mínimo de inscritos para cada campeonato será determinado pela organização. Caso este número mínimo não seja atingido, o campeonato poderá ser adiado ou cancelado. Em caso de cancelamento, o valor da inscrição será devolvido pela administração.
                    </Typography>
                    <Typography paragraph>
                        Restrição da inscrição – A administração poderá negar inscrição a qualquer piloto que tenha sido banido oficialmente em outra liga, mesmo que de outro simulador.
                    </Typography>
                </AccordionDetails>
            </Accordion>

            {/* 4. FORMATO E CONTEÚDO ESPECIAL */}
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                        4. FORMATO E CONTEÚDO ESPECIAL
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography paragraph>
                        As informações gerais para cada campeonato serão descritas no site da Liga Guerreiros do AV, na seção Campeonatos, bem como, setup aberto ou fechado, qualificação, duração das baterias, itens e apps obrigatórios, pontuação e descartes, desgastes dos pneus e consumo de combustível, condição da pista e damage dos carros, uso de ABS ou TC, o uso do restritor de acordo com a posição do grid (válido do 1º ao 6º colocado), critério para desempates e por fim, o calendário completo do campeonato.
                    </Typography>
                    <Typography paragraph>
                        Conteúdo especial (MOD da GAV): Será disponibilizado individualmente a cada inscrito, após a inscrição pelo link enviado junto com a divulgação do campeonato, o pagamento da taxa e o preenchimento do formulário de comprometimento referente ao uso do conteúdo produzido pela Liga Guerreiros do AV.
                    </Typography>
                    <Typography paragraph>
                        Caso verifiquemos que existe alguma grande disparidade entre os carros em algum MOD, poderá haver ajustes durante a realização do campeonato.
                    </Typography>
                </AccordionDetails>
            </Accordion>

            {/* 5. CANAIS DE COMUNICAÇÃO E SKINS */}
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                        5. CANAIS DE COMUNICAÇÃO E SKINS
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography paragraph>
                        Os canais de comunicação oficiais da Guerreiros do AV são os grupos do Whatsapp, o Discord, o Site (www.gavclube.com.br), Facebook e Instagram.
                    </Typography>
                    <Typography paragraph>
                        Fica a critério de cada participante ou equipe usar o Discord como comunicação interna.
                    </Typography>
                    <Typography paragraph>
                        Caso exista alguma necessidade especial que exija a utilização do Discord durante nossos eventos, esta informação será divulgada previamente pela administração.
                    </Typography>
                    <Typography paragraph>
                        Adicionalmente, após as etapas, serão convidados ao Discord os 3 primeiros colocados da(s) bateria(s) da etapa, sendo opcional a participação do piloto na entrevista da transmissão.
                    </Typography>
                    <Typography paragraph>
                        Envio de pinturas: É permitido o envio das pinturas das equipes até no máximo 2 dias antes do início do campeonato, através do e-mail guerreirosdoav.ac@gmail.com, com a resolução máxima de 2048×2048.
                    </Typography>
                    <Typography paragraph>
                        Não serão aceitas skins que com conteúdos inapropriados, ou que desrespeitem os membros, ficando a critério da administração a sua não habilitação no servidor, sendo a mesma substituída por uma skin padrão do MOD.
                    </Typography>
                    <Typography paragraph>
                        Poderá haver restrição de áreas específicas da skin para cotas de patrocinadores da Guerreiros do AV, neste caso, as áreas restritas serão informadas e será enviado template com a camada a ser aplicada à skin. Esta camada não pode ser retirada, e deve ficar em primeiro plano na skin.
                    </Typography>
                </AccordionDetails>
            </Accordion>

            {/* 6. PROTESTOS E PENALIDADES (CRÍTICO) */}
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                        6. PROTESTOS E PENALIDADES (CRÍTICO)
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography paragraph>
                        Até 24h após cada etapa do campeonato, qualquer piloto que se sentir prejudicado durante uma etapa tem o direito de submeter um protesto formal à Direção de Prova para análise. Este direito é garantido e se mantém independentemente de quaisquer ações tomadas na pista pelos outros pilotos envolvidos, incluindo, mas não se limitando a, a devolução de posição.
                    </Typography>
                    <Typography paragraph>
                        O protesto precisa conter uma descrição do ocorrido, indicação de bateria e número da volta, os pilotos envolvidos, replay com no mínimo 20s, mostrando a ocorrência em pelo menos 4 ângulos: vista interna de cada carro, superior de cada carro. Precisa mostrar ainda quantas posições foram perdidas por conta do acidente.
                    </Typography>
                    <Typography paragraph sx={{ fontWeight: 'bold' }}>
                        Aplicação de Penalidades: Após a análise do incidente e uma vez constatada a culpabilidade de um piloto, as penalidades serão aplicadas conforme os critérios de "Fair Play".
                    </Typography>
                    <Typography paragraph>
                        * Incidentes sem a Constatação de "Fair Play": Caso a Direção de Prova determine que o piloto infrator não realizou nenhuma ação imediata para mitigar o prejuízo causado ao adversário (ato de "Fair Play"), a penalidade padrão definida para a infração será aplicada em seu valor integral (100%).
                    </Typography>
                    <Typography paragraph>
                        * Incidentes com a Constatação de "Fair Play": Caso a Direção de Prova constate que o piloto infrator demonstrou um ato claro e imediato de "Fair Play", a penalidade padrão definida para a infração será reduzida em 50% (cinquenta por cento).
                    </Typography>
                    <Typography paragraph>
                        Para os fins deste regulamento, um ato de "Fair Play" é caracterizado, principalmente, pela devolução voluntária e imediata da posição obtida indevidamente, realizada de forma segura e que não gere novos riscos aos demais competidores.
                    </Typography>
                    <Typography paragraph>
                        A Guerreiros do AV não se responsabiliza pela gravação da corrida. Cada piloto deve configurar seu simulador para que este grave o replay da etapa.
                    </Typography>
                </AccordionDetails>
            </Accordion>

            {/* 7. TABELA DE PUNIÇÕES */}
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                        7. TABELA DE PUNIÇÕES
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography paragraph>
                        +10s +10kg lastro + 10% de restritor para a próxima etapa: Causar colisão, causando a perda de 1 posição, não devolvendo a posição na sequência;
                    </Typography>
                    <Typography paragraph>
                        +20s +20kg lastro + 20% de restritor para a próxima etapa: Causar colisão, causando a perda de 2 a 5 posições, não devolvendo a posição na sequência;
                    </Typography>
                    <Typography paragraph>
                        +45s +45kg lastro + 45% de restritor para a próxima etapa: Causar colisão, causando a perda de 6 ou mais posições, não devolvendo a posição na sequência;
                    </Typography>
                    <Typography paragraph sx={{ fontWeight: 'bold' }}>
                        ACIDENTES OCORRIDOS NA PRIMEIRA VOLTA TERÃO A PUNIÇÃO DUPLICADA.
                    </Typography>
                    <Typography paragraph sx={{ fontWeight: 'bold' }}>
                        OS LASTROS E RESTRITORES PODERÃO SOFRER ALTERAÇÃO CONFORME O MOD UTILIZADO.
                    </Typography>
                    <Typography paragraph>
                        +5s: Mudar mais de uma vez a posição na pista para evitar ultrapassagem (zigue-zague). É permitido fazer a defesa, tomando um lado da pista e retomar o traçado antes da faixa de frenagem, desde que o adversário não esteja em condição de ataque (adversário ao lado, mesmo que com o bico do carro somente);
                    </Typography>
                    <Typography paragraph>
                        +15s: Insistir em bloquear passagem recebendo bandeira azul;
                    </Typography>
                    <Typography paragraph>
                        +10s: Cortar caminho quando o RP não pune automaticamente (punição por ocorrência);
                    </Typography>
                    <Typography paragraph>
                        +10s: Sair da fila indiana antes entre os sinais vermelho e verde durante procedimento de largada lançada;
                    </Typography>
                    <Typography paragraph>
                        +20s: Tomar posição de outro piloto durante a volta de alinhamento;
                    </Typography>
                    <Typography paragraph>
                        +30s: Buscar a posição original em caso de acidente, rodada ou atraso na largada lançada;
                    </Typography>
                    <Typography paragraph>
                        DSQ: Causar acidente ao bloquear passagem recebendo bandeira azul;
                    </Typography>
                    <Typography paragraph>
                        DSQ do campeonato: Causar acidente propositalmente. Neste caso, será avaliado pela administração da Guerreiros os danos causados e se ficar claro que o acidente foi provocado para auxiliar piloto na briga pelo título, ambos poderão ser excluídos da liga.
                    </Typography>
                    <Typography paragraph>
                        Colisões envolvendo vários carros serão avaliadas pelos administradores e poderão ter punições específicas, conforme o caso.
                    </Typography>
                    <Typography paragraph>
                        Outras punições poderão ser adicionadas a este regulamento conforme os protestos sejam recebidos.
                    </Typography>
                </AccordionDetails>
            </Accordion>

            {/* 8. PROCEDIMENTOS DE LARGADA LANÇADA */}
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                        8. PROCEDIMENTOS DE LARGADA LANÇADA
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography paragraph>
                        Início regular do AC atrás do Safety Car. Não comece a se mover até que todas as luzes de partida estejam apagadas como de costume e o Safety Car esteja na frente de todos os carros. Só comece a se mover quando um carro da frente der partida. Se o carro à sua frente não começar a se mover dentro de 5s (após o carro 2 lugares à sua frente ter começado a se mover), então você e todos os que estão atrás de você poderão ultrapassá-lo com segurança.
                    </Typography>
                    <Typography paragraph>
                        O carro que atrasou a largada em 5s deve permanecer parado, deixar todos passarem e largar da última posição geral.
                    </Typography>
                    <Typography paragraph>
                        Widget "SC": Observe o widget "SC" – significa que uma grade está se formando atrás do safety car. Não corra e mude de posição nesta fase, tente manter um ritmo consistente atrás do piloto da frente. Nenhum pneu aquece ao oscilar, frear ou acelerar.
                    </Typography>
                    <Typography paragraph>
                        Seguir o carro a frente em fila indiana (ou lado a lodo, conforme orientado na página do campeonato) observando os sinais do RP e a velocidade máxima indicada, conforme o MOD utilizado;
                    </Typography>
                    <Typography paragraph>
                        O sinal de SC estará ligado com a luz amarela acesa;
                    </Typography>
                    <Typography paragraph>
                        Ao se aproximar do final da volta, o sinal amarelo do SC irá apagar; (sinalizando que o SC vai para o box no final desta volta);
                    </Typography>
                    <Typography paragraph>
                        Mantenha-se próximo da velocidade máxima indicada e mantenha uma distância segura e constante do carro da frente. Sem verificações de freio.
                    </Typography>
                    <Typography paragraph>
                        Momentos antes da largada o aviso "SC" vai desaparecer e a luz vermelha irá acender, sinalizando que o "Safety Car" já recolheu para o box – mantenha a velocidade em mantendo a fila indiana (ou lado a lado) – largada em 10s – procure não variar mais a velocidade, caso esteja acima da velocidade indicada no momento da luz verde, receberá punição automática de "Drive Through";
                    </Typography>
                    <Typography paragraph>
                        Luz Verde: Largada. A partir deste momento, e só a partir deste momento, pode-se desfazer a fila e todos estão liberados para acelerar, independente da localização na pista.
                    </Typography>
                    <Typography paragraph sx={{ fontWeight: 'bold' }}>
                        IMPORTANTE 1: A ACELERAÇÃO DEVE SER CONTÍNUA, PARA EVITAR O EFEITO SANFONA E RISCO DE ACIDENTES.
                    </Typography>
                    <Typography paragraph sx={{ fontWeight: 'bold' }}>
                        IMPORTANTE 2: O PILOTO QUE SE ATRASAR PARA ALINHAR OU NÃO ESTIVER NO GRID NO MOMENTO QUE AS LUZES VERMELHAS APAGAM E PRECISAR SAIR DOS BOXES, DEVE ALINHAR ATRÁS DE TODO GRID PARA A LARGADA, NÃO PODE BUSCAR A SUA POSIÇÃO DE QUALIFICAÇÃO DURANTE A VOLTA DE ALINHAMENTO.
                    </Typography>
                </AccordionDetails>
            </Accordion>

            {/* Link externo discreto no rodapé */}
            <Box sx={{ mt: 6, textAlign: 'center', pb: 4 }}>
                <Typography variant="body2" color="text.secondary">
                    <Link
                        href="https://gavclube.com.br"
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                        Ver no site oficial da GAV (gavclube.com.br)
                    </Link>
                </Typography>
            </Box>
        </Container>
    );
}
