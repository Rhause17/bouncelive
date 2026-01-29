import { Utils } from './utils.js';
import { BASE_GRAVITY, GRAVITY_PRESETS, REBOUND_PRESETS } from './constants.js';

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

          ball.onCollision(collision.normal.x, collision.normal.y, reflection.impactSpeed);

          this.collisionEvents.push({
            x: collision.closest.x,
            y: collision.closest.y,
            normalX: collision.normal.x,
            normalY: collision.normal.y,
            speed: reflection.impactSpeed,
            isFirstHit: !shape.hasBeenHit,
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
