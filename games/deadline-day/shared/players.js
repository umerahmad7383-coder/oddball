/* Deadline Day — footballer pool.
 *
 * Squads reflect a mid-2026 snapshot and ratings are this game's own estimates (not any official
 * game's ratings). Edit freely: one row per footballer.
 *   [name, position, nation code, club, rating]
 * Positions: GK CB LB RB CDM CM CAM LM RM LW RW ST
 * Optional photos: add an entry to PHOTOS below ({ 'Player Name': 'https://…' }) with images
 * you have the rights to use; cards fall back to the built-in illustrated portrait.
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
  'Al Nassr': 'SPL', 'Al Hilal': 'SPL', 'Al Ittihad': 'SPL', 'Al Ahli': 'SPL',
  'Inter Miami': 'MLS', LAFC: 'MLS', Vancouver: 'MLS',
  Galatasaray: 'SL', Fenerbahçe: 'SL', Benfica: 'POR', Porto: 'POR', Santos: 'BRA', 'Rosario Central': 'ARG', PSV: 'ERE',
};
export const NATIONS = {
  ENG: 'England', FRA: 'France', ESP: 'Spain', GER: 'Germany', ITA: 'Italy', POR: 'Portugal', NED: 'Netherlands', BEL: 'Belgium',
  BRA: 'Brazil', ARG: 'Argentina', URU: 'Uruguay', COL: 'Colombia', ECU: 'Ecuador', NOR: 'Norway', SWE: 'Sweden', DEN: 'Denmark',
  CRO: 'Croatia', SRB: 'Serbia', SVN: 'Slovenia', SVK: 'Slovakia', HUN: 'Hungary', POL: 'Poland', CZE: 'Czechia', SUI: 'Switzerland',
  TUR: 'Türkiye', GEO: 'Georgia', SCO: 'Scotland', EGY: 'Egypt', MAR: 'Morocco', SEN: 'Senegal', NGA: 'Nigeria', GHA: 'Ghana',
  CMR: 'Cameroon', CIV: 'Côte d’Ivoire', GUI: 'Guinea', ALG: 'Algeria', COD: 'DR Congo', JPN: 'Japan', KOR: 'South Korea',
  USA: 'USA', CAN: 'Canada', MEX: 'Mexico', NZL: 'New Zealand', GAB: 'Gabon', ACA: 'Academy',
};
export const PHOTOS = {
  // 'Erling Haaland': 'https://example.com/your-licensed-photo.jpg',
};

const ROWS = [
  // ---- Premier League
  ['Erling Haaland', 'ST', 'NOR', 'Man City', 91], ['Rodri', 'CDM', 'ESP', 'Man City', 88], ['Gianluigi Donnarumma', 'GK', 'ITA', 'Man City', 88],
  ['Rúben Dias', 'CB', 'POR', 'Man City', 86], ['Phil Foden', 'CAM', 'ENG', 'Man City', 85], ['Joško Gvardiol', 'CB', 'CRO', 'Man City', 85],
  ['Bernardo Silva', 'CM', 'POR', 'Man City', 85], ['Tijjani Reijnders', 'CM', 'NED', 'Man City', 84], ['Omar Marmoush', 'ST', 'EGY', 'Man City', 83],
  ['Rayan Cherki', 'CAM', 'FRA', 'Man City', 83], ['Jérémy Doku', 'LW', 'BEL', 'Man City', 82], ['John Stones', 'CB', 'ENG', 'Man City', 81],
  ['Nathan Aké', 'CB', 'NED', 'Man City', 80], ['Matheus Nunes', 'RB', 'POR', 'Man City', 79],
  ['Mohamed Salah', 'RW', 'EGY', 'Liverpool', 89], ['Virgil van Dijk', 'CB', 'NED', 'Liverpool', 88], ['Alisson', 'GK', 'BRA', 'Liverpool', 88],
  ['Florian Wirtz', 'CAM', 'GER', 'Liverpool', 87], ['Alexander Isak', 'ST', 'SWE', 'Liverpool', 87], ['Alexis Mac Allister', 'CM', 'ARG', 'Liverpool', 86],
  ['Ryan Gravenberch', 'CDM', 'NED', 'Liverpool', 85], ['Dominik Szoboszlai', 'CM', 'HUN', 'Liverpool', 84], ['Ibrahima Konaté', 'CB', 'FRA', 'Liverpool', 84],
  ['Hugo Ekitiké', 'ST', 'FRA', 'Liverpool', 83], ['Cody Gakpo', 'LW', 'NED', 'Liverpool', 83], ['Jeremie Frimpong', 'RB', 'NED', 'Liverpool', 82],
  ['Milos Kerkez', 'LB', 'HUN', 'Liverpool', 80], ['Wataru Endo', 'CDM', 'JPN', 'Liverpool', 76],
  ['Bukayo Saka', 'RW', 'ENG', 'Arsenal', 88], ['William Saliba', 'CB', 'FRA', 'Arsenal', 88], ['Declan Rice', 'CM', 'ENG', 'Arsenal', 87],
  ['Martin Ødegaard', 'CAM', 'NOR', 'Arsenal', 86], ['Gabriel Magalhães', 'CB', 'BRA', 'Arsenal', 86], ['David Raya', 'GK', 'ESP', 'Arsenal', 86],
  ['Viktor Gyökeres', 'ST', 'SWE', 'Arsenal', 85], ['Martín Zubimendi', 'CDM', 'ESP', 'Arsenal', 85], ['Eberechi Eze', 'CAM', 'ENG', 'Arsenal', 83],
  ['Mikel Merino', 'CM', 'ESP', 'Arsenal', 83], ['Kai Havertz', 'ST', 'GER', 'Arsenal', 82], ['Jurriën Timber', 'RB', 'NED', 'Arsenal', 82],
  ['Gabriel Martinelli', 'LW', 'BRA', 'Arsenal', 82], ['Piero Hincapié', 'CB', 'ECU', 'Arsenal', 81], ['Leandro Trossard', 'LW', 'BEL', 'Arsenal', 81],
  ['Riccardo Calafiori', 'LB', 'ITA', 'Arsenal', 80], ['Noni Madueke', 'RW', 'ENG', 'Arsenal', 80], ['Ben White', 'RB', 'ENG', 'Arsenal', 80],
  ['Cole Palmer', 'CAM', 'ENG', 'Chelsea', 87], ['Moisés Caicedo', 'CDM', 'ECU', 'Chelsea', 86], ['Enzo Fernández', 'CM', 'ARG', 'Chelsea', 85],
  ['Reece James', 'RB', 'ENG', 'Chelsea', 83], ['Marc Cucurella', 'LB', 'ESP', 'Chelsea', 82], ['João Pedro', 'ST', 'BRA', 'Chelsea', 82],
  ['Levi Colwill', 'CB', 'ENG', 'Chelsea', 81], ['Pedro Neto', 'RW', 'POR', 'Chelsea', 81], ['Alejandro Garnacho', 'LW', 'ARG', 'Chelsea', 80],
  ['Estêvão', 'RW', 'BRA', 'Chelsea', 80], ['Jamie Gittens', 'LW', 'ENG', 'Chelsea', 78], ['Robert Sánchez', 'GK', 'ESP', 'Chelsea', 79],
  ['Liam Delap', 'ST', 'ENG', 'Chelsea', 77],
  ['Bruno Fernandes', 'CAM', 'POR', 'Man United', 86], ['Bryan Mbeumo', 'RW', 'CMR', 'Man United', 83], ['Matheus Cunha', 'ST', 'BRA', 'Man United', 82],
  ['Lisandro Martínez', 'CB', 'ARG', 'Man United', 82], ['Matthijs de Ligt', 'CB', 'NED', 'Man United', 81], ['Benjamin Šeško', 'ST', 'SVN', 'Man United', 81],
  ['Amad Diallo', 'RW', 'CIV', 'Man United', 80], ['Manuel Ugarte', 'CDM', 'URU', 'Man United', 79], ['Kobbie Mainoo', 'CM', 'ENG', 'Man United', 79],
  ['Noussair Mazraoui', 'RB', 'MAR', 'Man United', 79], ['Harry Maguire', 'CB', 'ENG', 'Man United', 78], ['Senne Lammens', 'GK', 'BEL', 'Man United', 76],
  ['Cristian Romero', 'CB', 'ARG', 'Tottenham', 84], ['Guglielmo Vicario', 'GK', 'ITA', 'Tottenham', 83], ['Pedro Porro', 'RB', 'ESP', 'Tottenham', 83],
  ['Micky van de Ven', 'CB', 'NED', 'Tottenham', 83], ['Xavi Simons', 'CAM', 'NED', 'Tottenham', 82], ['Mohammed Kudus', 'RW', 'GHA', 'Tottenham', 82],
  ['Dejan Kulusevski', 'RW', 'SWE', 'Tottenham', 81], ['Destiny Udogie', 'LB', 'ITA', 'Tottenham', 80], ['James Maddison', 'CAM', 'ENG', 'Tottenham', 80],
  ['Dominic Solanke', 'ST', 'ENG', 'Tottenham', 80], ['Rodrigo Bentancur', 'CM', 'URU', 'Tottenham', 79],
  ['Emiliano Martínez', 'GK', 'ARG', 'Aston Villa', 86], ['Ollie Watkins', 'ST', 'ENG', 'Aston Villa', 83], ['Youri Tielemans', 'CM', 'BEL', 'Aston Villa', 81],
  ['Morgan Rogers', 'CAM', 'ENG', 'Aston Villa', 81], ['Ezri Konsa', 'CB', 'ENG', 'Aston Villa', 80],
  ['Bruno Guimarães', 'CM', 'BRA', 'Newcastle', 86], ['Sandro Tonali', 'CDM', 'ITA', 'Newcastle', 84], ['Anthony Gordon', 'LW', 'ENG', 'Newcastle', 82],
  ['Nick Woltemade', 'ST', 'GER', 'Newcastle', 80], ['Tino Livramento', 'RB', 'ENG', 'Newcastle', 80], ['Yoane Wissa', 'ST', 'COD', 'Newcastle', 79],
  ['Jarrod Bowen', 'RW', 'ENG', 'West Ham', 81], ['Morgan Gibbs-White', 'CAM', 'ENG', 'Nott’m Forest', 81], ['Elliot Anderson', 'CM', 'ENG', 'Nott’m Forest', 81],
  ['Murillo', 'CB', 'BRA', 'Nott’m Forest', 80], ['Chris Wood', 'ST', 'NZL', 'Nott’m Forest', 79], ['Adam Wharton', 'CM', 'ENG', 'Crystal Palace', 80],
  ['Jean-Philippe Mateta', 'ST', 'FRA', 'Crystal Palace', 80], ['Dean Henderson', 'GK', 'ENG', 'Crystal Palace', 80], ['Ismaïla Sarr', 'RW', 'SEN', 'Crystal Palace', 79],
  ['Jordan Pickford', 'GK', 'ENG', 'Everton', 83], ['Jack Grealish', 'LW', 'ENG', 'Everton', 80], ['Kaoru Mitoma', 'LW', 'JPN', 'Brighton', 81],
  ['Carlos Baleba', 'CDM', 'CMR', 'Brighton', 80], ['Bart Verbruggen', 'GK', 'NED', 'Brighton', 80], ['Raúl Jiménez', 'ST', 'MEX', 'Fulham', 78],
  ['Tyler Adams', 'CDM', 'USA', 'Bournemouth', 79], ['Granit Xhaka', 'CM', 'SUI', 'Sunderland', 82], ['Kyle Walker', 'RB', 'ENG', 'Burnley', 78],
  ['Jhon Arias', 'RW', 'COL', 'Wolves', 79],
  // ---- LaLiga
  ['Kylian Mbappé', 'ST', 'FRA', 'Real Madrid', 91], ['Vinícius Júnior', 'LW', 'BRA', 'Real Madrid', 90], ['Jude Bellingham', 'CAM', 'ENG', 'Real Madrid', 89],
  ['Thibaut Courtois', 'GK', 'BEL', 'Real Madrid', 89], ['Federico Valverde', 'CM', 'URU', 'Real Madrid', 88], ['Trent Alexander-Arnold', 'RB', 'ENG', 'Real Madrid', 86],
  ['Aurélien Tchouaméni', 'CDM', 'FRA', 'Real Madrid', 85], ['Antonio Rüdiger', 'CB', 'GER', 'Real Madrid', 84], ['Éder Militão', 'CB', 'BRA', 'Real Madrid', 84],
  ['Rodrygo', 'RW', 'BRA', 'Real Madrid', 84], ['Eduardo Camavinga', 'CM', 'FRA', 'Real Madrid', 83], ['Arda Güler', 'CAM', 'TUR', 'Real Madrid', 83],
  ['Dean Huijsen', 'CB', 'ESP', 'Real Madrid', 82], ['Álvaro Carreras', 'LB', 'ESP', 'Real Madrid', 80], ['Brahim Díaz', 'CAM', 'MAR', 'Real Madrid', 80],
  ['Franco Mastantuono', 'RW', 'ARG', 'Real Madrid', 78],
  ['Lamine Yamal', 'RW', 'ESP', 'Barcelona', 90], ['Raphinha', 'LW', 'BRA', 'Barcelona', 89], ['Pedri', 'CM', 'ESP', 'Barcelona', 89],
  ['Robert Lewandowski', 'ST', 'POL', 'Barcelona', 86], ['Frenkie de Jong', 'CM', 'NED', 'Barcelona', 86], ['Jules Koundé', 'RB', 'FRA', 'Barcelona', 85],
  ['Ronald Araújo', 'CB', 'URU', 'Barcelona', 83], ['Pau Cubarsí', 'CB', 'ESP', 'Barcelona', 84], ['Dani Olmo', 'CAM', 'ESP', 'Barcelona', 84],
  ['Joan García', 'GK', 'ESP', 'Barcelona', 84], ['Alejandro Balde', 'LB', 'ESP', 'Barcelona', 82], ['Gavi', 'CM', 'ESP', 'Barcelona', 82],
  ['Marcus Rashford', 'LW', 'ENG', 'Barcelona', 81],
  ['Julián Álvarez', 'ST', 'ARG', 'Atlético Madrid', 87], ['Jan Oblak', 'GK', 'SVN', 'Atlético Madrid', 87], ['Antoine Griezmann', 'CAM', 'FRA', 'Atlético Madrid', 84],
  ['Koke', 'CM', 'ESP', 'Atlético Madrid', 81], ['Alexander Sørloth', 'ST', 'NOR', 'Atlético Madrid', 82], ['Pablo Barrios', 'CM', 'ESP', 'Atlético Madrid', 81],
  ['Álex Baena', 'CAM', 'ESP', 'Atlético Madrid', 82], ['Conor Gallagher', 'CM', 'ENG', 'Atlético Madrid', 80],
  ['Nico Williams', 'LW', 'ESP', 'Athletic Club', 85], ['Unai Simón', 'GK', 'ESP', 'Athletic Club', 83], ['Mikel Oyarzabal', 'ST', 'ESP', 'Real Sociedad', 83],
  ['Takefusa Kubo', 'RW', 'JPN', 'Real Sociedad', 81], ['Isco', 'CAM', 'ESP', 'Real Betis', 82], ['Giovani Lo Celso', 'CAM', 'ARG', 'Real Betis', 80],
  ['Sofyan Amrabat', 'CDM', 'MAR', 'Real Betis', 79],
  // ---- Serie A
  ['Lautaro Martínez', 'ST', 'ARG', 'Inter', 88], ['Nicolò Barella', 'CM', 'ITA', 'Inter', 87], ['Alessandro Bastoni', 'CB', 'ITA', 'Inter', 86],
  ['Hakan Çalhanoğlu', 'CDM', 'TUR', 'Inter', 85], ['Yann Sommer', 'GK', 'SUI', 'Inter', 84], ['Federico Dimarco', 'LB', 'ITA', 'Inter', 84],
  ['Marcus Thuram', 'ST', 'FRA', 'Inter', 84],
  ['Mike Maignan', 'GK', 'FRA', 'AC Milan', 87], ['Rafael Leão', 'LW', 'POR', 'AC Milan', 85], ['Christian Pulisic', 'RW', 'USA', 'AC Milan', 84],
  ['Luka Modrić', 'CM', 'CRO', 'AC Milan', 84], ['Christopher Nkunku', 'CAM', 'FRA', 'AC Milan', 80], ['Santiago Giménez', 'ST', 'MEX', 'AC Milan', 79],
  ['Pervis Estupiñán', 'LB', 'ECU', 'AC Milan', 79],
  ['Gleison Bremer', 'CB', 'BRA', 'Juventus', 84], ['Kenan Yıldız', 'LW', 'TUR', 'Juventus', 83], ['Jonathan David', 'ST', 'CAN', 'Juventus', 83],
  ['Dušan Vlahović', 'ST', 'SRB', 'Juventus', 82], ['Weston McKennie', 'CM', 'USA', 'Juventus', 80],
  ['Kevin De Bruyne', 'CAM', 'BEL', 'Napoli', 86], ['Scott McTominay', 'CM', 'SCO', 'Napoli', 85], ['Stanislav Lobotka', 'CDM', 'SVK', 'Napoli', 83],
  ['Romelu Lukaku', 'ST', 'BEL', 'Napoli', 82], ['Alessandro Buongiorno', 'CB', 'ITA', 'Napoli', 82], ['Rasmus Højlund', 'ST', 'DEN', 'Napoli', 79],
  ['Paulo Dybala', 'CAM', 'ARG', 'Roma', 82], ['Ademola Lookman', 'LW', 'NGA', 'Atalanta', 83],
  // ---- Bundesliga
  ['Harry Kane', 'ST', 'ENG', 'Bayern Munich', 90], ['Jamal Musiala', 'CAM', 'GER', 'Bayern Munich', 88], ['Joshua Kimmich', 'CDM', 'GER', 'Bayern Munich', 87],
  ['Michael Olise', 'RW', 'FRA', 'Bayern Munich', 87], ['Manuel Neuer', 'GK', 'GER', 'Bayern Munich', 85], ['Luis Díaz', 'LW', 'COL', 'Bayern Munich', 85],
  ['Jonathan Tah', 'CB', 'GER', 'Bayern Munich', 84], ['Dayot Upamecano', 'CB', 'FRA', 'Bayern Munich', 83], ['Alphonso Davies', 'LB', 'CAN', 'Bayern Munich', 83],
  ['Kim Min-jae', 'CB', 'KOR', 'Bayern Munich', 83], ['Serge Gnabry', 'RW', 'GER', 'Bayern Munich', 81], ['Aleksandar Pavlović', 'CM', 'GER', 'Bayern Munich', 81],
  ['Nicolas Jackson', 'ST', 'SEN', 'Bayern Munich', 80],
  ['Serhou Guirassy', 'ST', 'GUI', 'Dortmund', 84], ['Gregor Kobel', 'GK', 'SUI', 'Dortmund', 85], ['Nico Schlotterbeck', 'CB', 'GER', 'Dortmund', 83],
  ['Patrik Schick', 'ST', 'CZE', 'Leverkusen', 81],
  // ---- Ligue 1
  ['Ousmane Dembélé', 'ST', 'FRA', 'PSG', 90], ['Vitinha', 'CM', 'POR', 'PSG', 88], ['Khvicha Kvaratskhelia', 'LW', 'GEO', 'PSG', 88],
  ['Achraf Hakimi', 'RB', 'MAR', 'PSG', 87], ['João Neves', 'CM', 'POR', 'PSG', 86], ['Nuno Mendes', 'LB', 'POR', 'PSG', 86],
  ['Marquinhos', 'CB', 'BRA', 'PSG', 85], ['Désiré Doué', 'RW', 'FRA', 'PSG', 85], ['Willian Pacho', 'CB', 'ECU', 'PSG', 84],
  ['Fabián Ruiz', 'CM', 'ESP', 'PSG', 83], ['Bradley Barcola', 'LW', 'FRA', 'PSG', 83], ['Lucas Chevalier', 'GK', 'FRA', 'PSG', 82],
  ['Gonçalo Ramos', 'ST', 'POR', 'PSG', 80], ['Lee Kang-in', 'CAM', 'KOR', 'PSG', 80],
  // ---- Elsewhere
  ['Cristiano Ronaldo', 'ST', 'POR', 'Al Nassr', 84], ['Sadio Mané', 'LW', 'SEN', 'Al Nassr', 81], ['Kingsley Coman', 'LW', 'FRA', 'Al Nassr', 81],
  ['João Félix', 'CAM', 'POR', 'Al Nassr', 80],
  ['Theo Hernández', 'LB', 'FRA', 'Al Hilal', 84], ['Yassine Bounou', 'GK', 'MAR', 'Al Hilal', 84], ['Rúben Neves', 'CDM', 'POR', 'Al Hilal', 82],
  ['Darwin Núñez', 'ST', 'URU', 'Al Hilal', 81], ['Kalidou Koulibaly', 'CB', 'SEN', 'Al Hilal', 80],
  ['Moussa Diaby', 'RW', 'FRA', 'Al Ittihad', 80], ['Riyad Mahrez', 'RW', 'ALG', 'Al Ahli', 81], ['Ivan Toney', 'ST', 'ENG', 'Al Ahli', 81],
  ['Lionel Messi', 'RW', 'ARG', 'Inter Miami', 88], ['Rodrigo De Paul', 'CM', 'ARG', 'Inter Miami', 82], ['Luis Suárez', 'ST', 'URU', 'Inter Miami', 79],
  ['Son Heung-min', 'LW', 'KOR', 'LAFC', 84], ['Thomas Müller', 'CAM', 'GER', 'Vancouver', 80],
  ['Victor Osimhen', 'ST', 'NGA', 'Galatasaray', 86], ['Leroy Sané', 'RW', 'GER', 'Galatasaray', 82],
  ['Ederson', 'GK', 'BRA', 'Fenerbahçe', 84], ['Youssef En-Nesyri', 'ST', 'MAR', 'Fenerbahçe', 80], ['Edson Álvarez', 'CDM', 'MEX', 'Fenerbahçe', 80],
  ['Diogo Costa', 'GK', 'POR', 'Porto', 84], ['Nicolás Otamendi', 'CB', 'ARG', 'Benfica', 80], ['Richard Ríos', 'CM', 'COL', 'Benfica', 79],
  ['Neymar', 'LW', 'BRA', 'Santos', 80], ['Ángel Di María', 'RW', 'ARG', 'Rosario Central', 78],
];

const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const FOOTBALLERS = ROWS.map(([name, pos, nation, club, rating]) => ({
  id: slug(name), name, pos, nation, club, league: CLUBS[club] || 'PL', rating, photo: PHOTOS[name] || null,
}));
export const BY_ID = Object.fromEntries(FOOTBALLERS.map((f) => [f.id, f]));

/* Generated youngsters used to fill a squad that couldn't be completed (e.g. a manager disconnected). */
const FIRST = ['Alfie', 'Leo', 'Mateo', 'Noah', 'Ilyas', 'Kai', 'Luca', 'Theo', 'Yusuf', 'Joao', 'Ruben', 'Elias', 'Tomas', 'Ayo', 'Finn'];
const LAST = ['Okafor', 'Silva', 'Novak', 'Haddad', 'Moreau', 'Kowal', 'Brandt', 'Rossi', 'Mensah', 'Costa', 'Petrov', 'Nakamura', 'Lindqvist', 'Duarte'];
export function makeAcademy(pos, n) {
  const name = `${FIRST[(n * 7) % FIRST.length]} ${LAST[(n * 5 + 3) % LAST.length]}`;
  return { id: `academy-${n}`, name, pos, nation: 'ACA', club: 'Academy', league: 'ACA', rating: 58 + (n % 5), photo: null, academy: true };
}
