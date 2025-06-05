import * as THREE from 'three';

export class PlayerShip {
  constructor() {
    this.mesh = this.createMesh();
    this.velocity = new THREE.Vector2(0, 0);
    this.rotation = Math.PI / 2; // Start facing "up" (positive Y)
    this.maxSpeed = 60; // Increased from 25
    this.acceleration = 100; // Increased from 40
    this.drag = 0.97; // Decreased drag effect (closer to 1 means less drag)
    this.engineParticles = [];
    this.setupEngineParticles();
  }

  createMesh() {
    const group = new THREE.Group();
    
    // Main hull
    const hullGeometry = new THREE.ConeGeometry(1.2, 4, 3);
    const hullMaterial = new THREE.MeshBasicMaterial({ color: 0x4488aa });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.rotation.z = Math.PI / 2;
    group.add(hull);
    
    // Engine pods
    const engineGeometry = new THREE.BoxGeometry(0.6, 0.3, 0.3);
    const engineMaterial = new THREE.MeshBasicMaterial({ color: 0x2266aa });
    
    const leftEngine = new THREE.Mesh(engineGeometry, engineMaterial);
    leftEngine.position.set(-1.5, 1, 0);
    group.add(leftEngine);
    
    const rightEngine = new THREE.Mesh(engineGeometry, engineMaterial);
    rightEngine.position.set(-1.5, -1, 0);
    group.add(rightEngine);
    
    // Cockpit
    const cockpitGeometry = new THREE.SphereGeometry(0.4, 8, 6);
    const cockpitMaterial = new THREE.MeshBasicMaterial({ color: 0x66aacc });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0.5, 0, 0.2);
    group.add(cockpit);
    
    return group;
  }

  setupEngineParticles() {
    for (let i = 0; i < 20; i++) {
      const geometry = new THREE.SphereGeometry(0.1, 4, 4);
      const material = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color().setHSL(0.1, 1, 0.5 + Math.random() * 0.5)
      });
      const particle = new THREE.Mesh(geometry, material);
      particle.visible = false;
      this.mesh.add(particle);
      this.engineParticles.push({
        mesh: particle,
        life: 0,
        maxLife: 0.3 + Math.random() * 0.2
      });
    }
  }

  update(deltaTime, keys, gameState) {
    const thrust = new THREE.Vector2(0, 0);
    let isThrusting = false;
    
    // Movement input
    if (keys['KeyW'] || keys['ArrowUp']) {
      thrust.x += Math.cos(this.rotation);
      thrust.y += Math.sin(this.rotation);
      isThrusting = true;
    }
    if (keys['KeyS'] || keys['ArrowDown']) {
      thrust.x -= Math.cos(this.rotation) * 0.5;
      thrust.y -= Math.sin(this.rotation) * 0.5;
    }
    // Removed A/D key rotation, ship now aims at mouse
    
    // Aim at mouse cursor
    if (gameState.mouseWorldPosition) {
        const dx = gameState.mouseWorldPosition.x - this.mesh.position.x;
        const dy = gameState.mouseWorldPosition.y - this.mesh.position.y;
        this.rotation = Math.atan2(dy, dx);
    }
    
    // Apply engine upgrades
    const engineMultiplier = 1 + (gameState.engineLevel - 1) * 0.3;
    const maxSpeed = this.maxSpeed * engineMultiplier;
    const acceleration = this.acceleration * engineMultiplier;
    
    // Apply acceleration
    if (thrust.length() > 0) {
      thrust.normalize();
      this.velocity.x += thrust.x * acceleration * deltaTime;
      this.velocity.y += thrust.y * acceleration * deltaTime;
    }
    
    // Apply drag and speed limit
    this.velocity.multiplyScalar(this.drag);
    if (this.velocity.length() > maxSpeed) {
      this.velocity.normalize().multiplyScalar(maxSpeed);
    }
    
    // Update position
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.y += this.velocity.y * deltaTime;
    
    // Update rotation
    this.mesh.rotation.z = this.rotation; // Align visual rotation with physics rotation
    
    // Update engine particles
    this.updateEngineParticles(deltaTime, isThrusting, gameState.engineLevel);
  }

  updateEngineParticles(deltaTime, isThrusting, engineLevel) {
    this.engineParticles.forEach(particle => {
      if (isThrusting && particle.life <= 0) {
        // Spawn new particle
        particle.life = particle.maxLife;
        particle.mesh.position.set(
          -2 - Math.random() * 0.5, // Spawn behind the engine
          (Math.random() - 0.5) * 1, // Spread within engine bounds
          0
        );
        particle.mesh.visible = true;
        // Determine color based on engine level
        let hue, saturation, lightness;
        if (engineLevel === 1) {
          hue = 0.1 + Math.random() * 0.05; // Orange-Yellow
          saturation = 1;
          lightness = 0.6 + Math.random() * 0.2;
        } else if (engineLevel === 2) {
          hue = 0.05 + Math.random() * 0.05; // More intense Orange/Reddish
          saturation = 1;
          lightness = 0.7 + Math.random() * 0.2;
        } else if (engineLevel === 3) {
          hue = 0.6 + Math.random() * 0.05; // Light Blue
          saturation = 1;
          lightness = 0.7 + Math.random() * 0.2;
        } else { // Level 4+
          hue = 0.55 + Math.random() * 0.1; // Brighter Blue/Cyan
          saturation = 0.8 + Math.random() * 0.2;
          lightness = 0.8 + Math.random() * 0.15;
        }
        particle.mesh.material.color.setHSL(hue, saturation, lightness);
        particle.mesh.scale.setScalar(0.6 + Math.random() * 0.4 + (engineLevel -1) * 0.1); // Particles get slightly larger with upgrades
      }
      
      if (particle.life > 0) {
        particle.life -= deltaTime;
        particle.mesh.position.x -= deltaTime * 15;
        particle.mesh.material.opacity = particle.life / particle.maxLife;
        
        if (particle.life <= 0) {
          particle.mesh.visible = false;
        }
      }
    });
  }
}