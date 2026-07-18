const fs = require('fs');
const file = 'src/hooks/useHoles.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /\/\*\*\n\s+\* Set a planning segment to the max distance of a selected club\.\n\s+\*\/\n\s+const maximizePlanningSegment = useCallback\([\s\S]*?\[holes, selectedHoleIndex, movePlanningMarker\],\n\s+\)/;

const match = content.match(regex);
if (match) {
  content = content.replace(regex, '');
  
  const moveRegex = /(\/\*\*\n\s+\* Move a map marker \(reference point\)\. Optimistic UI; sync in background\.\n\s+\*\/\n\s+const moveMapMarker = useCallback\([\s\S]*?\[holes, selectedHoleIndex\],\n\s+\))/;
  content = content.replace(moveRegex, `${match[0]}\n\n  $1`);
  
  fs.writeFileSync(file, content);
  console.log('Fixed');
} else {
  console.log('Not found');
}
