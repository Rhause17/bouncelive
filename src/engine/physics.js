import { Utils } from './utils.js';
import { BASE_GRAVITY, GRAVITY_PRESETS, REBOUND_PRESETS, ShapeTypeEnum, BELT_TANGENTIAL_STRENGTH, BELT_VERTICAL_DAMPING, SIZE_SCALE, FLIPPER_BASE_IMPULSE, FLIPPER_MIN_MULTIPLIER, FLIPPER_MAX_MULTIPLIER } from './constants.js';

export class Physics {
  constructor() {
    this.gravity = BASE_GRAVITY;
    this.restitution = 0.75;
    this.friction = 0.90;
    this.substeps = 4;
    this.collisionEvents = [];
    this.hasHadFirstCollision = false;
    this.wrongSideHitThisFrame = false;
  }

  resetCollisionTracking() {
    this.hasHadFirstCollision = false;
  }

  setLevelSpecs(gravityPreset, reboundPreset) {
    const gPreset = GRAVITY_PRESETS[gravityPreset];
    const rPreset = REBOUND_PRESETS[reboundPreset];
    this.gravity = BASE_GRAVITY * gPreset.multiplier;
    this.restitution = rPreset.restitution;
    this.friction = rPreset.friction;
  }

  update(ball, shapes, dt, basket = null) {
    this.collisionEvents = [];
    this.wrongSideHitThisFrame = false;

    if (ball.vanishing) {
      ball.update(dt, this.gravity);
      return;
    }

    const subDt = dt / this.substeps;
    for (let i = 0; i < this.substeps; i++) {
      ball.update(subDt, this.gravity);

      if (ball.vanishing) break;

      this.resolveShapeCollisions(ball, shapes);

      if (this.wrongSideHitThisFrame) break;

      if (basket) this.resolveBasketCollisions(ball, basket);
    }
  }

  resolveShapeCollisions(ball, shapes) {
    for (const shape of shapes) {
      if (!shape.isVisible()) continue;

      // Flipper cooldown: skip collision while swinging (ball passes through)
      if (shape.shapeType === ShapeTypeEnum.PINBALL_BOUNCER && shape.isSwinging) {
        continue;
      }

      const segments = shape.getSegments();
      for (let segIdx = 0; segIdx < segments.length; segIdx++) {
        const seg = segments[segIdx];
        const collision = Utils.resolveSegmentCollision(
          { x: ball.x, y: ball.y }, ball.radius, seg,
        );
        if (!collision) continue;

        const oneWayResult = Utils.evaluateOneWayCollision(shape, seg, segIdx, collision);

        if (oneWayResult.shouldVanish) {
          this.collisionEvents.push({
            x: collision.closest.x,
            y: collision.closest.y,
            normalX: collision.normal.x,
            normalY: collision.normal.y,
            speed: 0,
            isFirstHit: false,
            isWrongSideHit: true,
          });
          this.wrongSideHitThisFrame = true;
          return;
        }

        this.hasHadFirstCollision = true;

        ball.x += collision.normal.x * collision.penetration;
        ball.y += collision.normal.y * collision.penetration;

        const reflection = Utils.reflectVelocity(
          { x: ball.vx, y: ball.vy },
          collision.normal,
          this.restitution,
          this.friction,
        );

        if (reflection) {
          ball.vx = reflection.vel.x;
          ball.vy = reflection.vel.y;

          // Apply conveyor belt physics (after normal reflection)
          let isBeltHit = false;
          if (shape.shapeType === ShapeTypeEnum.CONVEYOR_BELT && seg.isBeltActive) {
            isBeltHit = true;

            // 1. Apply tangential impulse
            const tangent = shape.getBeltTangent();
            const impulse = BELT_TANGENTIAL_STRENGTH * SIZE_SCALE * seg.beltDirection;
            ball.vx += tangent.x * impulse;
            ball.vy += tangent.y * impulse;

            // 2. Apply vertical damping (40% energy loss in normal direction)
            const normalComponent = ball.vx * collision.normal.x + ball.vy * collision.normal.y;
            ball.vx -= collision.normal.x * normalComponent * (1 - BELT_VERTICAL_DAMPING);
            ball.vy -= collision.normal.y * normalComponent * (1 - BELT_VERTICAL_DAMPING);

            // 3. Trigger impact ripple
            shape.triggerImpactRipple(collision.closest.x, collision.closest.y);
          }

          // Pinball bouncer (flipper): strong impulse "slap" only on top edge (sideIndex 1)
          // Other surfaces (bottom, caps) act as static - normal collision only
          if (shape.shapeType === ShapeTypeEnum.PINBALL_BOUNCER && seg.sideIndex === 1) {
            // Calculate force based on hit position (0 = pivot, 1 = tip)
            const hitRatio = shape.getHitPositionRatio(collision.closest);
            const positionMultiplier = FLIPPER_MIN_MULTIPLIER + (FLIPPER_MAX_MULTIPLIER - FLIPPER_MIN_MULTIPLIER) * hitRatio;

            // Calculate impulse direction (surface normal, pointing away from flipper)
            const surfaceNormal = shape.getSurfaceNormal(collision.closest);
            const impulse = FLIPPER_BASE_IMPULSE * SIZE_SCALE * positionMultiplier;

            ball.vx += surfaceNormal.x * impulse;
            ball.vy += surfaceNormal.y * impulse;

            // Trigger swing animation (cooldown starts)
            shape.triggerSwing();
          }

          ball.onCollision(collision.normal.x, collision.normal.y, reflection.impactSpeed);

          this.collisionEvents.push({
            x: collision.closest.x,
            y: collision.closest.y,
            normalX: collision.normal.x,
            normalY: collision.normal.y,
            speed: reflection.impactSpeed,
            isFirstHit: !shape.hasBeenHit,
            isBeltHit,
          });

          if (!shape.hasBeenHit) {
            shape.hasBeenHit = true;
            shape.startDisappear();
          }
        }
      }
    }
  }

  resolveBasketCollisions(ball, basket) {
    for (const seg of basket.getSegments()) {
      const collision = Utils.resolveSegmentCollision(
        { x: ball.x, y: ball.y }, ball.radius, seg,
      );
      if (!collision) continue;

      ball.x += collision.normal.x * collision.penetration;
      ball.y += collision.normal.y * collision.penetration;

      const reflection = Utils.reflectVelocity(
        { x: ball.vx, y: ball.vy },
        collision.normal,
        this.restitution,
        this.friction,
      );

      if (reflection) {
        ball.vx = reflection.vel.x;
        ball.vy = reflection.vel.y;

        ball.onCollision(collision.normal.x, collision.normal.y, reflection.impactSpeed);

        this.collisionEvents.push({
          x: collision.closest.x,
          y: collision.closest.y,
          normalX: collision.normal.x,
          normalY: collision.normal.y,
          speed: reflection.impactSpeed,
          isFirstHit: false,
        });
      }
    }
  }
}
