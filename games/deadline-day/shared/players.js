/* Deadline Day — footballer pool.
 *
 * Clubs are checked against the summer 2026 transfer window (closed 1 September 2026) and ratings are this game's own estimates (not any official
 * game's ratings). Edit freely: one row per footballer.
 *   [name, position, nation code, club, rating]
 * Positions: GK CB LB RB CDM CM CAM LM RM LW RW ST
 * Photos: drop image files into public/photos/ named after the player (e.g. "Erling Haaland.jpg").
 * See public/photos/README.txt. Cards fall back to a silhouette when there's no photo.
 */
export const LEAGUES = {
  PL: 'Premier League', LL: 'LaLiga', SA: 'Serie A', BL: 'Bundesliga', L1: 'Ligue 1', SPL: 'Saudi Pro League',
  MLS: 'MLS', SL: 'Süper Lig', POR: 'Liga Portugal', BRA: 'Brasileirão', ARG: 'Liga Profesional', ERE: 'Eredivisie',
};
export const CLUBS = {
  'Man City': 'PL', Liverpool: 'PL', Arsenal: 'PL', Chelsea: 'PL', 'Man United': 'PL', Tottenham: 'PL', 'Aston Villa': 'PL',
  Newcastle: 'PL', 'West Ham': 'PL', 'Nott’m Forest': 'PL', 'Crystal Palace': 'PL', Everton: 'PL', Brighton: 'PL', Fulham: 'PL',
  Bournemouth: 'PL', Brentford: 'PL', Sunderland: 'PL', Burnley: 'PL', Wolves: 'PL',
  'Real Madrid': 'LL', Barcelona: 'LL', 'Atlético Madrid': 'LL', 'Athletic Club': 'LL', 'Real Sociedad': 'LL', 'Real Betis': 'LL', Villarreal: 'LL',
  Inter: 'SA', 'AC Milan': 'SA', Juventus: 'SA', Napoli: 'SA', Roma: 'SA', Atalanta: 'SA', Lazio: 'SA',
  'Bayern Munich': 'BL', Dortmund: 'BL', Leverkusen: 'BL', Leipzig: 'BL', Stuttgart: 'BL', Frankfurt: 'BL',
  PSG: 'L1', Marseille: 'L1', Monaco: 'L1', Lille: 'L1',
  'Al Nassr': 'SPL', 'Al Hilal': 'SPL', 'Al Ittihad': 'SPL', 'Al Ahli': 'SPL', 'Al Qadsiah': 'SPL',
  'Inter Miami': 'MLS', LAFC: 'MLS', Vancouver: 'MLS', 'Orlando City': 'MLS', 'Chicago Fire': 'MLS',
  Galatasaray: 'SL', Fenerbahçe: 'SL', Beşiktaş: 'SL', Trabzonspor: 'SL', Fiorentina: 'SA', Benfica: 'POR', Porto: 'POR', Santos: 'BRA', 'Rosario Central': 'ARG', PSV: 'ERE',
};
export const NATIONS = {
  ENG: 'England', FRA: 'France', ESP: 'Spain', GER: 'Germany', ITA: 'Italy', POR: 'Portugal', NED: 'Netherlands', BEL: 'Belgium',
  BRA: 'Brazil', ARG: 'Argentina', URU: 'Uruguay', COL: 'Colombia', ECU: 'Ecuador', NOR: 'Norway', SWE: 'Sweden', DEN: 'Denmark',
  CRO: 'Croatia', SRB: 'Serbia', SVN: 'Slovenia', SVK: 'Slovakia', HUN: 'Hungary', POL: 'Poland', CZE: 'Czechia', SUI: 'Switzerland',
  TUR: 'Türkiye', GEO: 'Georgia', SCO: 'Scotland', EGY: 'Egypt', MAR: 'Morocco', SEN: 'Senegal', NGA: 'Nigeria', GHA: 'Ghana',
  CMR: 'Cameroon', CIV: 'Côte d’Ivoire', GUI: 'Guinea', ALG: 'Algeria', COD: 'DR Congo', JPN: 'Japan', KOR: 'South Korea',
  USA: 'USA', CAN: 'Canada', MEX: 'Mexico', NZL: 'New Zealand', GAB: 'Gabon', ACA: 'Academy',
};

const ROWS = [
  // ---- Premier League
  ['Erling Haaland', 'ST', 'NOR', 'Man City', 91], ['Gianluigi Donnarumma', 'GK', 'ITA', 'Man City', 88], ['Enzo Fernández', 'CM', 'ARG', 'Man City', 86],
  ['Rúben Dias', 'CB', 'POR', 'Man City', 86], ['Phil Foden', 'CAM', 'ENG', 'Man City', 85], ['Joško Gvardiol', 'CB', 'CRO', 'Man City', 85],
  ['Elliot Anderson', 'CM', 'ENG', 'Man City', 84], ['Rayan Cherki', 'CAM', 'FRA', 'Man City', 84], ['Jérémy Doku', 'LW', 'BEL', 'Man City', 82],
  ['Iliman Ndiaye', 'LW', 'SEN', 'Man City', 81], ['Ayyoub Bouaddi', 'CDM', 'FRA', 'Man City', 78], ['Matheus Nunes', 'RB', 'POR', 'Man City', 79],
  ['Virgil van Dijk', 'CB', 'NED', 'Liverpool', 87], ['Alisson', 'GK', 'BRA', 'Liverpool', 88], ['Florian Wirtz', 'CAM', 'GER', 'Liverpool', 87],
  ['Alexander Isak', 'ST', 'SWE', 'Liverpool', 87], ['Alexis Mac Allister', 'CM', 'ARG', 'Liverpool', 86], ['Ryan Gravenberch', 'CDM', 'NED', 'Liverpool', 85],
  ['Bradley Barcola', 'LW', 'FRA', 'Liverpool', 85], ['Dominik Szoboszlai', 'CM', 'HUN', 'Liverpool', 85], ['Hugo Ekitiké', 'ST', 'FRA', 'Liverpool', 84],
  ['Ronald Araújo', 'CB', 'URU', 'Liverpool', 82], ['Cody Gakpo', 'LW', 'NED', 'Liverpool', 83], ['Jeremie Frimpong', 'RB', 'NED', 'Liverpool', 82],
  ['Milos Kerkez', 'LB', 'HUN', 'Liverpool', 80], ['Jérémy Jacquet', 'CB', 'FRA', 'Liverpool', 79],
  ['Bukayo Saka', 'RW', 'ENG', 'Arsenal', 88], ['William Saliba', 'CB', 'FRA', 'Arsenal', 88], ['Declan Rice', 'CM', 'ENG', 'Arsenal', 88],
  ['Martin Ødegaard', 'CAM', 'NOR', 'Arsenal', 85], ['Gabriel Magalhães', 'CB', 'BRA', 'Arsenal', 86], ['David Raya', 'GK', 'ESP', 'Arsenal', 86],
  ['Bruno Guimarães', 'CM', 'BRA', 'Arsenal', 85], ['Viktor Gyökeres', 'ST', 'SWE', 'Arsenal', 85], ['Martín Zubimendi', 'CDM', 'ESP', 'Arsenal', 86],
  ['Eberechi Eze', 'CAM', 'ENG', 'Arsenal', 84], ['Mikel Merino', 'CM', 'ESP', 'Arsenal', 83], ['Kai Havertz', 'ST', 'GER', 'Arsenal', 82],
  ['Jurriën Timber', 'RB', 'NED', 'Arsenal', 84], ['Piero Hincapié', 'CB', 'ECU', 'Arsenal', 82], ['Ezri Konsa', 'CB', 'ENG', 'Arsenal', 81],
  ['Riccardo Calafiori', 'LB', 'ITA', 'Arsenal', 81], ['Noni Madueke', 'RW', 'ENG', 'Arsenal', 81], ['Ben White', 'RB', 'ENG', 'Arsenal', 79],
  ['Cole Palmer', 'CAM', 'ENG', 'Chelsea', 87], ['Moisés Caicedo', 'CDM', 'ECU', 'Chelsea', 87], ['Morgan Rogers', 'CAM', 'ENG', 'Chelsea', 84],
  ['Emiliano Martínez', 'GK', 'ARG', 'Chelsea', 85], ['Reece James', 'RB', 'ENG', 'Chelsea', 84], ['João Pedro', 'ST', 'BRA', 'Chelsea', 83],
  ['Levi Colwill', 'CB', 'ENG', 'Chelsea', 81], ['Pedro Neto', 'RW', 'POR', 'Chelsea', 81], ['Estêvão', 'RW', 'BRA', 'Chelsea', 82],
  ['Jamie Gittens', 'LW', 'ENG', 'Chelsea', 79], ['Maxence Lacroix', 'CB', 'FRA', 'Chelsea', 80],
  ['Bruno Fernandes', 'CAM', 'POR', 'Man United', 86], ['Bryan Mbeumo', 'RW', 'CMR', 'Man United', 84], ['Matheus Cunha', 'ST', 'BRA', 'Man United', 83],
  ['Carlos Baleba', 'CDM', 'CMR', 'Man United', 82], ['Lisandro Martínez', 'CB', 'ARG', 'Man United', 82], ['Youri Tielemans', 'CM', 'BEL', 'Man United', 81],
  ['Matthijs de Ligt', 'CB', 'NED', 'Man United', 81], ['Benjamin Šeško', 'ST', 'SVN', 'Man United', 81], ['Amad Diallo', 'RW', 'CIV', 'Man United', 81],
  ['Kobbie Mainoo', 'CM', 'ENG', 'Man United', 79], ['Noussair Mazraoui', 'RB', 'MAR', 'Man United', 79], ['Senne Lammens', 'GK', 'BEL', 'Man United', 78],
  ['Sandro Tonali', 'CDM', 'ITA', 'Tottenham', 85], ['Savinho', 'RW', 'BRA', 'Tottenham', 82], ['Pedro Porro', 'RB', 'ESP', 'Tottenham', 83],
  ['Micky van de Ven', 'CB', 'NED', 'Tottenham', 84], ['Xavi Simons', 'CAM', 'NED', 'Tottenham', 82], ['Mohammed Kudus', 'RW', 'GHA', 'Tottenham', 82],
  ['Omar Marmoush', 'ST', 'EGY', 'Tottenham', 81], ['Andy Robertson', 'LB', 'SCO', 'Tottenham', 80], ['Jan Paul van Hecke', 'CB', 'NED', 'Tottenham', 81],
  ['Mateus Fernandes', 'CM', 'POR', 'Tottenham', 80], ['Dejan Kulusevski', 'RW', 'SWE', 'Tottenham', 80], ['Destiny Udogie', 'LB', 'ITA', 'Tottenham', 80],
  ['Dominic Solanke', 'ST', 'ENG', 'Tottenham', 80],
  ['Nicolas Jackson', 'ST', 'SEN', 'Aston Villa', 80], ['Leon Goretzka', 'CM', 'GER', 'Aston Villa', 82], ['João Gomes', 'CDM', 'BRA', 'Aston Villa', 80],
  ['Alejandro Garnacho', 'LW', 'ARG', 'Aston Villa', 80],
  ['Nico González', 'CDM', 'ESP', 'Newcastle', 80], ['Tino Livramento', 'RB', 'ENG', 'Newcastle', 80], ['Yoane Wissa', 'ST', 'COD', 'Newcastle', 79],
  ['Morgan Gibbs-White', 'CAM', 'ENG', 'Nott’m Forest', 81], ['Murillo', 'CB', 'BRA', 'Nott’m Forest', 81], ['Liam Delap', 'ST', 'ENG', 'Nott’m Forest', 78],
  ['Chris Wood', 'ST', 'NZL', 'Nott’m Forest', 79], ['Adam Wharton', 'CM', 'ENG', 'Crystal Palace', 81], ['Jean-Philippe Mateta', 'ST', 'FRA', 'Crystal Palace', 80],
  ['Dean Henderson', 'GK', 'ENG', 'Crystal Palace', 80], ['Ismaïla Sarr', 'RW', 'SEN', 'Crystal Palace', 79], ['Jordan Pickford', 'GK', 'ENG', 'Everton', 83],
  ['Jack Grealish', 'LW', 'ENG', 'Everton', 80], ['Kaoru Mitoma', 'LW', 'JPN', 'Brighton', 81], ['Bart Verbruggen', 'GK', 'NED', 'Brighton', 80],
  ['Tyler Adams', 'CDM', 'USA', 'Bournemouth', 79], ['Granit Xhaka', 'CM', 'SUI', 'Sunderland', 82],
  // ---- LaLiga
  ['Kylian Mbappé', 'ST', 'FRA', 'Real Madrid', 91], ['Vinícius Júnior', 'LW', 'BRA', 'Real Madrid', 89], ['Jude Bellingham', 'CAM', 'ENG', 'Real Madrid', 88],
  ['Thibaut Courtois', 'GK', 'BEL', 'Real Madrid', 89], ['Federico Valverde', 'CM', 'URU', 'Real Madrid', 88], ['Trent Alexander-Arnold', 'RB', 'ENG', 'Real Madrid', 85],
  ['Bernardo Silva', 'CM', 'POR', 'Real Madrid', 85], ['Aurélien Tchouaméni', 'CDM', 'FRA', 'Real Madrid', 85], ['Ibrahima Konaté', 'CB', 'FRA', 'Real Madrid', 84],
  ['Yan Diomande', 'RW', 'CIV', 'Real Madrid', 84], ['Antonio Rüdiger', 'CB', 'GER', 'Real Madrid', 83], ['Éder Militão', 'CB', 'BRA', 'Real Madrid', 84],
  ['Rodrygo', 'RW', 'BRA', 'Real Madrid', 83], ['Marc Cucurella', 'LB', 'ESP', 'Real Madrid', 83], ['Eduardo Camavinga', 'CM', 'FRA', 'Real Madrid', 83],
  ['Arda Güler', 'CAM', 'TUR', 'Real Madrid', 84], ['Dean Huijsen', 'CB', 'ESP', 'Real Madrid', 83], ['Denzel Dumfries', 'RB', 'NED', 'Real Madrid', 81],
  ['Álvaro Carreras', 'LB', 'ESP', 'Real Madrid', 80], ['Brahim Díaz', 'CAM', 'MAR', 'Real Madrid', 80],
  ['Lamine Yamal', 'RW', 'ESP', 'Barcelona', 91], ['Rodri', 'CDM', 'ESP', 'Barcelona', 89], ['Raphinha', 'LW', 'BRA', 'Barcelona', 88],
  ['Pedri', 'CM', 'ESP', 'Barcelona', 89], ['Frenkie de Jong', 'CM', 'NED', 'Barcelona', 85], ['Jules Koundé', 'RB', 'FRA', 'Barcelona', 85],
  ['Pau Cubarsí', 'CB', 'ESP', 'Barcelona', 85], ['Joan García', 'GK', 'ESP', 'Barcelona', 85], ['Anthony Gordon', 'LW', 'ENG', 'Barcelona', 83],
  ['Dani Olmo', 'CAM', 'ESP', 'Barcelona', 83], ['Alejandro Balde', 'LB', 'ESP', 'Barcelona', 82], ['Gavi', 'CM', 'ESP', 'Barcelona', 82],
  ['Karim Adeyemi', 'LW', 'GER', 'Barcelona', 80],
  ['Julián Álvarez', 'ST', 'ARG', 'Atlético Madrid', 87], ['Jan Oblak', 'GK', 'SVN', 'Atlético Madrid', 86], ['Cristian Romero', 'CB', 'ARG', 'Atlético Madrid', 84],
  ['Alejandro Grimaldo', 'LB', 'ESP', 'Atlético Madrid', 83], ['Jonathan David', 'ST', 'CAN', 'Atlético Madrid', 82], ['Álex Baena', 'CAM', 'ESP', 'Atlético Madrid', 82],
  ['Lee Kang-in', 'CAM', 'KOR', 'Atlético Madrid', 81], ['Morten Hjulmand', 'CDM', 'DEN', 'Atlético Madrid', 81], ['Pablo Barrios', 'CM', 'ESP', 'Atlético Madrid', 82],
  ['Alexander Sørloth', 'ST', 'NOR', 'Atlético Madrid', 81], ['Koke', 'CM', 'ESP', 'Atlético Madrid', 80], ['Conor Gallagher', 'CM', 'ENG', 'Atlético Madrid', 80],
  ['Nico Williams', 'LW', 'ESP', 'Athletic Club', 84], ['Unai Simón', 'GK', 'ESP', 'Athletic Club', 83], ['Mikel Oyarzabal', 'ST', 'ESP', 'Real Sociedad', 83],
  ['Takefusa Kubo', 'RW', 'JPN', 'Real Sociedad', 81], ['Isco', 'CAM', 'ESP', 'Real Betis', 81], ['Giovani Lo Celso', 'CAM', 'ARG', 'Real Betis', 80],
  // ---- Serie A
  ['Lautaro Martínez', 'ST', 'ARG', 'Inter', 88], ['Nicolò Barella', 'CM', 'ITA', 'Inter', 86], ['Alessandro Bastoni', 'CB', 'ITA', 'Inter', 86],
  ['Hakan Çalhanoğlu', 'CDM', 'TUR', 'Inter', 84], ['Federico Dimarco', 'LB', 'ITA', 'Inter', 84], ['Marcus Thuram', 'ST', 'FRA', 'Inter', 84],
  ['Manuel Akanji', 'CB', 'SUI', 'Inter', 82], ['John Stones', 'CB', 'ENG', 'Inter', 80], ['Curtis Jones', 'CM', 'ENG', 'Inter', 80], ['Djed Spence', 'RB', 'ENG', 'Inter', 79],
  ['Mike Maignan', 'GK', 'FRA', 'AC Milan', 87], ['Christian Pulisic', 'RW', 'USA', 'AC Milan', 84], ['Luka Modrić', 'CM', 'CRO', 'AC Milan', 83],
  ['Gonçalo Ramos', 'ST', 'POR', 'AC Milan', 80], ['Pervis Estupiñán', 'LB', 'ECU', 'AC Milan', 79],
  ['Gleison Bremer', 'CB', 'BRA', 'Juventus', 84], ['Kenan Yıldız', 'LW', 'TUR', 'Juventus', 85], ['Randal Kolo Muani', 'ST', 'FRA', 'Juventus', 81],
  ['Guglielmo Vicario', 'GK', 'ITA', 'Juventus', 83], ['Nick Woltemade', 'ST', 'GER', 'Juventus', 80], ['Weston McKennie', 'CM', 'USA', 'Juventus', 80],
  ['Kevin De Bruyne', 'CAM', 'BEL', 'Napoli', 85], ['Scott McTominay', 'CM', 'SCO', 'Napoli', 86], ['Stanislav Lobotka', 'CDM', 'SVK', 'Napoli', 83],
  ['Alessandro Buongiorno', 'CB', 'ITA', 'Napoli', 82], ['Rasmus Højlund', 'ST', 'DEN', 'Napoli', 81], ['Franco Mastantuono', 'RW', 'ARG', 'Fiorentina', 78],
  // ---- Bundesliga
  ['Harry Kane', 'ST', 'ENG', 'Bayern Munich', 91], ['Michael Olise', 'RW', 'FRA', 'Bayern Munich', 89], ['Jamal Musiala', 'CAM', 'GER', 'Bayern Munich', 88],
  ['Joshua Kimmich', 'CDM', 'GER', 'Bayern Munich', 87], ['Luis Díaz', 'LW', 'COL', 'Bayern Munich', 86], ['Manuel Neuer', 'GK', 'GER', 'Bayern Munich', 84],
  ['Jonathan Tah', 'CB', 'GER', 'Bayern Munich', 84], ['Dayot Upamecano', 'CB', 'FRA', 'Bayern Munich', 84], ['Alphonso Davies', 'LB', 'CAN', 'Bayern Munich', 82],
  ['Kim Min-jae', 'CB', 'KOR', 'Bayern Munich', 82], ['Serge Gnabry', 'RW', 'GER', 'Bayern Munich', 81], ['Aleksandar Pavlović', 'CM', 'GER', 'Bayern Munich', 82],
  ['Ismael Saibari', 'CAM', 'MAR', 'Bayern Munich', 81],
  ['Serhou Guirassy', 'ST', 'GUI', 'Dortmund', 84], ['Gregor Kobel', 'GK', 'SUI', 'Dortmund', 85], ['Nico Schlotterbeck', 'CB', 'GER', 'Dortmund', 83],
  ['Patrik Schick', 'ST', 'CZE', 'Leverkusen', 81],
  // ---- Ligue 1
  ['Ousmane Dembélé', 'ST', 'FRA', 'PSG', 90], ['Vitinha', 'CM', 'POR', 'PSG', 89], ['Khvicha Kvaratskhelia', 'LW', 'GEO', 'PSG', 88],
  ['Achraf Hakimi', 'RB', 'MAR', 'PSG', 87], ['João Neves', 'CM', 'POR', 'PSG', 87], ['Nuno Mendes', 'LB', 'POR', 'PSG', 87],
  ['Marquinhos', 'CB', 'BRA', 'PSG', 85], ['Désiré Doué', 'RW', 'FRA', 'PSG', 86], ['Willian Pacho', 'CB', 'ECU', 'PSG', 85],
  ['Fabián Ruiz', 'CM', 'ESP', 'PSG', 83], ['Ferran Torres', 'ST', 'ESP', 'PSG', 83], ['Lucas Chevalier', 'GK', 'FRA', 'PSG', 82],
  ['Maghnes Akliouche', 'CAM', 'FRA', 'PSG', 81],
  // ---- Elsewhere
  ['Cristiano Ronaldo', 'ST', 'POR', 'Al Nassr', 83], ['Sadio Mané', 'LW', 'SEN', 'Al Nassr', 80], ['João Félix', 'CAM', 'POR', 'Al Nassr', 80],
  ['Karim Benzema', 'ST', 'FRA', 'Al Hilal', 82], ['Theo Hernández', 'LB', 'FRA', 'Al Hilal', 84], ['Yassine Bounou', 'GK', 'MAR', 'Al Hilal', 84],
  ['Gabriel Martinelli', 'LW', 'BRA', 'Al Hilal', 81], ['Ollie Watkins', 'ST', 'ENG', 'Al Hilal', 82], ['Rúben Neves', 'CDM', 'POR', 'Al Hilal', 82],
  ['Kalidou Koulibaly', 'CB', 'SEN', 'Al Hilal', 80], ['Youssef En-Nesyri', 'ST', 'MAR', 'Al Ittihad', 80], ['Riyad Mahrez', 'RW', 'ALG', 'Al Ahli', 80],
  ['Tijjani Reijnders', 'CM', 'NED', 'Al Qadsiah', 83],
  ['Lionel Messi', 'RW', 'ARG', 'Inter Miami', 88], ['Rodrigo De Paul', 'CM', 'ARG', 'Inter Miami', 82], ['Luis Suárez', 'ST', 'URU', 'Inter Miami', 78],
  ['Casemiro', 'CDM', 'BRA', 'Inter Miami', 79], ['Son Heung-min', 'LW', 'KOR', 'LAFC', 83], ['Thomas Müller', 'CAM', 'GER', 'Vancouver', 80],
  ['Antoine Griezmann', 'CAM', 'FRA', 'Orlando City', 83], ['Robert Lewandowski', 'ST', 'POL', 'Chicago Fire', 84],
  ['Victor Osimhen', 'ST', 'NGA', 'Galatasaray', 86], ['Rafael Leão', 'LW', 'POR', 'Galatasaray', 84], ['Leroy Sané', 'RW', 'GER', 'Galatasaray', 81],
  ['Romelu Lukaku', 'ST', 'BEL', 'Fenerbahçe', 80], ['Ederson', 'GK', 'BRA', 'Fenerbahçe', 84], ['Nathan Aké', 'CB', 'NED', 'Fenerbahçe', 80],
  ['Dušan Vlahović', 'ST', 'SRB', 'Beşiktaş', 81], ['Leandro Trossard', 'LW', 'BEL', 'Beşiktaş', 80], ['Mohamed Salah', 'RW', 'EGY', 'Trabzonspor', 86],
  ['Diogo Costa', 'GK', 'POR', 'Porto', 84], ['Santiago Giménez', 'ST', 'MEX', 'Porto', 79], ['Neymar', 'LW', 'BRA', 'Santos', 79],
  ['Ángel Di María', 'RW', 'ARG', 'Rosario Central', 78],
];

const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const slugify = slug;
export const FOOTBALLERS = ROWS.map(([name, pos, nation, club, rating]) => ({
  id: slug(name), name, pos, nation, club, league: CLUBS[club] || 'PL', rating,
}));
export const BY_ID = Object.fromEntries(FOOTBALLERS.map((f) => [f.id, f]));

/* Generated youngsters used to fill a squad that couldn't be completed (e.g. a manager disconnected). */
const FIRST = ['Alfie', 'Leo', 'Mateo', 'Noah', 'Ilyas', 'Kai', 'Luca', 'Theo', 'Yusuf', 'Joao', 'Ruben', 'Elias', 'Tomas', 'Ayo', 'Finn'];
const LAST = ['Okafor', 'Silva', 'Novak', 'Haddad', 'Moreau', 'Kowal', 'Brandt', 'Rossi', 'Mensah', 'Costa', 'Petrov', 'Nakamura', 'Lindqvist', 'Duarte'];
export function makeAcademy(pos, n) {
  const name = `${FIRST[(n * 7) % FIRST.length]} ${LAST[(n * 5 + 3) % LAST.length]}`;
  return { id: `academy-${n}`, name, pos, nation: 'ACA', club: 'Academy', league: 'ACA', rating: 58 + (n % 5), photo: null, academy: true };
}
