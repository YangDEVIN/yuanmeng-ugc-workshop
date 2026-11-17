(function (root) {
  // The training snapshot uses authored A/B waypoints; Dust II uses source BSP sites.
  const authoredSites = {
    template: [[10496, 3267, -160], [-354, 227, 557]],
  };
  const siteColors = { A: '#a53627', B: '#225b9b' };

  function sitesFor(mapId, geometry) {
    if (mapId === 'de_dust2') return geometry.sites;
    return authoredSites[mapId].map((position, i) => ({ id: i ? 'B' : 'A', position }));
  }

  function authoredSpawns(map) {
    return map.parts.filter(part => part.c === 'spawnT' || part.c === 'spawnCT').map((part, i) => {
      const team = part.c === 'spawnT' ? 'T' : 'CT';
      const support = map.parts.find(block => block.x === part.x && block.y === part.y &&
        block.tag === part.tag && block !== part && block.z <= part.z);
      return { id: `layout-${i}`, team, position: [part.x, part.y, (support || part).z + (support || part).h],
        yaw: Math.atan2(-part.y, -part.x) * 180 / Math.PI };
    });
  }

  function sourceSpawns(geometry) {
    return geometry.landmarks.map((point, i) => ({
      id: `original-${i}`,
      team: point.type === 'unassigned' ? 'N' : point.type === 'info_player_terrorist' ? 'T' : 'CT',
      position: [...point.position],
      yaw: point.yaw ?? 0,
    }));
  }

  function exportGuidance({ sites, spawns, source, toCm, yaw = 0 }) {
    return {
      units: 'cm',
      source,
      spawns: spawns.map(point => ({ ...point, position: toCm(point.position), yaw: ((point.yaw + yaw) % 360 + 360) % 360 })),
      sites: sites.map(site => ({ id: site.id, position: toCm(site.position) })),
    };
  }

  function addLabel(group, text, color, position) {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 46px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 160, 52);
    const map = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map, depthTest: false, sizeAttenuation: false });
    const label = new THREE.Sprite(material);
    label.position.copy(position);
    label.center.set(.5, 0);
    label.scale.set(.10, .030, 1);
    label.renderOrder = 20;
    group.add(label);
    return label;
  }

  function showGuides({ group, container, sites, mapPoint, focus, caption, labels = [] }) {
    container.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = caption;
    container.append(heading);
    for (const site of sites) {
      const point = mapPoint(site.position);
      addLabel(group, site.id + ' 区', siteColors[site.id], point);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'guide-button';
      button.textContent = '定位 ' + site.id + ' 区';
      button.onclick = () => focus(point);
      container.append(button);
    }
    for (const label of labels) addLabel(group, label.text, label.color, mapPoint(label.position));
  }

  const api = { sitesFor, authoredSpawns, sourceSpawns, exportGuidance, showGuides };
  if (typeof module !== 'undefined') module.exports = api;
  else root.MapGuidance = api;
})(globalThis);
