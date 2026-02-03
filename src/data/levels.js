// ========================================
// LEVEL DATA - Parsed from CSV
// ========================================

const LEVEL_CSV_DATA = `level;object count;objects;oneway object(s);to apply oneway;gravity;rebound;tutorial;obstacle;obstacle placement
1;3;1,2,3;0;;normal;normal;;;
2;3;1,4,2;0;;normal;normal;;;
3;3;3,5,1;0;;normal;normal;;;
4;3;4,6,3;4;4-0;normal;normal;one-way;;
5;3;5,9,10;5;5-0;low;normal;;;
6;3;2,4,12;2;2-2;normal;normal;conveyor;;
7;3;7,8,5;5,8;5-2|8-0,3;high;normal;;;
8;2;1,9;1;1-1;normal;normal;bouncer;13;(80,320)
9;4;4,11,6,3;4,11;4-0|11-0;high;bouncy;;;
10;4;2,8,7,9;2,8,9;2-0,2|8-0,3|9-0,1;low;bouncy;;;
11;4;5,10,3,1;5,1;5-0,2|1-1;high;low;;;
12;5;6,11,1,3,4;6,1;6-1,3|1-1;normal;low;;;
13;5;9,7,8,2,5;9,7,8;9-2,3,4,5|7-1,7|8-1,2;low;low;;;
14;5;10,2,3,4,11;10,2,4,11;10-1|2-0,2|4-1|11-0;high;bouncy;;;
15;5;6,6,4,6,6;6,6,6,6;6-0|6-1|6-2|6-3;high;low;;;
16;5;4,4,10,4,4;4,4,4,4;4-0|4-0|4-0|4-0;normal;bouncy;;;
17;5;11,11,5,11,11;11,11,11,11;11-0|11-1|11-2|11-3;low;low;;;
18;5;9,9,3,9,9;9,9,9,9;9-0|9-1|9-2,3|9-4,5;low;normal;;;
19;5;7,7,7,7,7;7,7,7,7,7;7-0|7-1|7-2|7-3;high;normal;;;
20;5;11,11,11,11,11;11,11,11,11,11;11-0|11-0|11-0|11-0|11-0;high;bouncy;;;`;

function parseLevelCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const levels = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by semicolon
    const fields = line.split(';');
    if (fields.length < 7) continue;

    const levelNum = parseInt(fields[0]);
    if (isNaN(levelNum)) continue;

    const objectCount = parseInt(fields[1]);

    const objectsRaw = fields[2].replace(/"/g, '');
    const objectIds = objectsRaw.split(',')
      .map(s => parseInt(s.trim().split('-')[0]))
      .filter(n => !isNaN(n));

    const onewayRaw = fields[3].replace(/"/g, '');
    let onewayIds = [];
    if (onewayRaw && onewayRaw !== '0' && onewayRaw !== '') {
      onewayIds = onewayRaw.split(',')
        .map(s => parseInt(s.trim().split('-')[0]))
        .filter(n => !isNaN(n));
    }

    const sidesRaw = fields[4].replace(/"/g, '');
    const onewayAssignments = [];
    if (sidesRaw && sidesRaw.trim()) {
      const assignments = sidesRaw.split('|');
      for (const assign of assignments) {
        const parts = assign.trim().split('-');
        if (parts.length >= 2) {
          const objId = parseInt(parts[0].trim());
          const sides = parts[1].split(',')
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n));
          if (!isNaN(objId) && sides.length > 0) {
            onewayAssignments.push({ objId, sides });
          }
        }
      }
    }

    let gravity = fields[5].trim().toLowerCase();
    if (gravity === 'low') gravity = 'Low';
    else if (gravity === 'high') gravity = 'High';
    else gravity = 'Normal';

    let rebound = fields[6].trim().toLowerCase();
    if (rebound === 'low') rebound = 'Soft';
    else if (rebound === 'bouncy') rebound = 'Bouncy';
    else rebound = 'Normal';

    // New columns: tutorial, obstacle, obstacle placement
    let tutorial = null;
    if (fields[7]) {
      const tutorialRaw = fields[7].trim().toLowerCase();
      if (tutorialRaw === 'one-way' || tutorialRaw === 'oneway') {
        tutorial = 'one_way';
      } else if (tutorialRaw === 'conveyor' || tutorialRaw === 'conveyor belt') {
        tutorial = 'conveyor_belt';
      } else if (tutorialRaw === 'bouncer' || tutorialRaw === 'flipper' || tutorialRaw === 'pinball') {
        tutorial = 'pinball_bouncer';
      }
    }

    // Parse obstacles
    const obstacles = [];
    if (fields[8] && fields[9]) {
      const obstacleType = fields[8].trim().toLowerCase();
      const placementRaw = fields[9].trim();

      // Parse placement: (x,y) or (x,y),(x,y)
      const placementMatches = placementRaw.match(/\((\d+),(\d+)\)/g);
      if (placementMatches) {
        for (const match of placementMatches) {
          const coords = match.match(/\((\d+),(\d+)\)/);
          if (coords) {
            const x = parseInt(coords[1]);
            const y = parseInt(coords[2]);

            let obstacleId = null;
            if (obstacleType === 'bouncer' || obstacleType === 'flipper' || obstacleType === '13') {
              obstacleId = 13; // Pinball Bouncer
            } else if (obstacleType === 'conveyor' || obstacleType === '12') {
              obstacleId = 12; // Conveyor Belt
            }

            if (obstacleId) {
              obstacles.push({ id: obstacleId, x, y, direction: 'right' });
            }
          }
        }
      }
    }

    levels[levelNum] = {
      level: levelNum,
      objectCount,
      objectIds,
      onewayIds,
      onewayAssignments,
      gravity,
      rebound,
      tutorial,
      obstacles,
    };
  }

  return levels;
}

export const LEVELS_DATA = parseLevelCSV(LEVEL_CSV_DATA);

export function getLevelConfig(levelNum) {
  return LEVELS_DATA[levelNum] || null;
}

export function getTotalLevels() {
  return Object.keys(LEVELS_DATA).length;
}
