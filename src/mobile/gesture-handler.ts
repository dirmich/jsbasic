/**
 * 터치 제스처 핸들러
 * 모바일 터치 이벤트를 감지하고 제스처로 변환합니다.
 */

import { EventEmitter } from '../utils/events.js';
import type {
  GestureType,
  SwipeDirection,
  TouchPoint,
  GestureEvent,
  GestureConfig
} from './types.js';

/**
 * 제스처 핸들러 클래스
 */
export class GestureHandler extends EventEmitter {
  private config: GestureConfig;
  private touchStartPoints: Map<number, TouchPoint> = new Map();
  private lastTapTime: number = 0;
  private lastTapPoint: TouchPoint | null = null;
  private longPressTimer: number | null = null;
  private isGestureActive: boolean = false;

  constructor(
    private element: HTMLElement,
    config?: Partial<GestureConfig>
  ) {
    super();

    this.config = {
      tapMaxDuration: 300,
      doubleTapMaxInterval: 300,
      longPressMinDuration: 500,
      swipeMinDistance: 50,
      swipeMaxDuration: 300,
      pinchMinScale: 0.1,
      dragMinDistance: 10,
      ...config
    };

    this.setupEventListeners();
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
  }

  /**
   * 터치 시작 핸들러
   */
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();

    const touches = Array.from(event.touches);

    // 모든 터치 포인트 저장
    touches.forEach(touch => {
      const point: TouchPoint = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
        identifier: touch.identifier
      };
      this.touchStartPoints.set(touch.identifier, point);
    });

    // 롱 프레스 타이머 시작
    if (touches.length === 1) {
      this.startLongPressTimer(touches[0]!);
    }

    this.isGestureActive = true;
  }

  /**
   * 터치 이동 핸들러
   */
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();

    // 롱 프레스 타이머 취소 (움직이면 롱 프레스 아님)
    this.cancelLongPressTimer();

    const touches = Array.from(event.touches);

    // 핀치 제스처 감지 (두 손가락)
    if (touches.length === 2) {
      this.detectPinch(touches[0]!, touches[1]!);
    }

    // 드래그 제스처 감지 (한 손가락)
    else if (touches.length === 1) {
      this.detectDrag(touches[0]!);
    }
  }

  /**
   * 터치 종료 핸들러
   */
  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();

    this.cancelLongPressTimer();

    const changedTouches = Array.from(event.changedTouches);

    changedTouches.forEach(touch => {
      const startPoint = this.touchStartPoints.get(touch.identifier);
      if (!startPoint) return;

      const endPoint: TouchPoint = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
        identifier: touch.identifier
      };

      const duration = endPoint.timestamp - startPoint.timestamp;
      const distance = this.calculateDistance(startPoint, endPoint);

      // 스와이프 감지
      if (duration < this.config.swipeMaxDuration && distance >= this.config.swipeMinDistance) {
        this.detectSwipe(startPoint, endPoint, duration);
      }
      // 탭 감지
      else if (duration < this.config.tapMaxDuration && distance < this.config.dragMinDistance) {
        this.detectTap(startPoint, endPoint, duration);
      }

      this.touchStartPoints.delete(touch.identifier);
    });

    if (event.touches.length === 0) {
      this.isGestureActive = false;
    }
  }

  /**
   * 터치 취소 핸들러
   */
  private handleTouchCancel(event: TouchEvent): void {
    event.preventDefault();

    this.cancelLongPressTimer();
    this.touchStartPoints.clear();
    this.isGestureActive = false;
  }

  /**
   * 탭 감지
   */
  private detectTap(startPoint: TouchPoint, endPoint: TouchPoint, duration: number): void {
    const now = Date.now();
    const timeSinceLastTap = now - this.lastTapTime;

    // 더블 탭 감지
    if (
      timeSinceLastTap < this.config.doubleTapMaxInterval &&
      this.lastTapPoint &&
      this.calculateDistance(this.lastTapPoint, endPoint) < this.config.dragMinDistance
    ) {
      const gestureEvent: GestureEvent = {
        type: 'doubletap',
        startPoint,
        endPoint,
        deltaX: endPoint.x - startPoint.x,
        deltaY: endPoint.y - startPoint.y,
        distance: this.calculateDistance(startPoint, endPoint),
        duration,
        velocity: 0
      };

      this.emit('doubletap', gestureEvent);
      this.lastTapTime = 0;
      this.lastTapPoint = null;
    }
    // 싱글 탭
    else {
      const gestureEvent: GestureEvent = {
        type: 'tap',
        startPoint,
        endPoint,
        deltaX: endPoint.x - startPoint.x,
        deltaY: endPoint.y - startPoint.y,
        distance: this.calculateDistance(startPoint, endPoint),
        duration,
        velocity: 0
      };

      this.emit('tap', gestureEvent);
      this.lastTapTime = now;
      this.lastTapPoint = endPoint;
    }
  }

  /**
   * 스와이프 감지
   */
  private detectSwipe(startPoint: TouchPoint, endPoint: TouchPoint, duration: number): void {
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    const distance = this.calculateDistance(startPoint, endPoint);
    const velocity = distance / duration;

    // 스와이프 방향 결정
    let direction: SwipeDirection;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    const gestureEvent: GestureEvent = {
      type: 'swipe',
      startPoint,
      endPoint,
      deltaX,
      deltaY,
      distance,
      duration,
      velocity,
      direction
    };

    this.emit('swipe', gestureEvent);
    this.emit(`swipe:${direction}`, gestureEvent);
  }

  /**
   * 핀치 감지
   */
  private detectPinch(touch1: Touch, touch2: Touch): void {
    const startPoint1 = this.touchStartPoints.get(touch1.identifier);
    const startPoint2 = this.touchStartPoints.get(touch2.identifier);

    if (!startPoint1 || !startPoint2) return;

    const currentPoint1: TouchPoint = {
      x: touch1.clientX,
      y: touch1.clientY,
      timestamp: Date.now(),
      identifier: touch1.identifier
    };

    const currentPoint2: TouchPoint = {
      x: touch2.clientX,
      y: touch2.clientY,
      timestamp: Date.now(),
      identifier: touch2.identifier
    };

    const startDistance = this.calculateDistance(startPoint1, startPoint2);
    const currentDistance = this.calculateDistance(currentPoint1, currentPoint2);
    const scale = currentDistance / startDistance;

    if (Math.abs(1 - scale) >= this.config.pinchMinScale) {
      const gestureEvent: GestureEvent = {
        type: 'pinch',
        startPoint: startPoint1,
        endPoint: currentPoint1,
        deltaX: currentPoint1.x - startPoint1.x,
        deltaY: currentPoint1.y - startPoint1.y,
        distance: currentDistance,
        duration: Date.now() - startPoint1.timestamp,
        velocity: 0,
        scale
      };

      this.emit('pinch', gestureEvent);
    }
  }

  /**
   * 드래그 감지
   */
  private detectDrag(touch: Touch): void {
    const startPoint = this.touchStartPoints.get(touch.identifier);
    if (!startPoint) return;

    const currentPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
      identifier: touch.identifier
    };

    const distance = this.calculateDistance(startPoint, currentPoint);

    if (distance >= this.config.dragMinDistance) {
      const gestureEvent: GestureEvent = {
        type: 'drag',
        startPoint,
        endPoint: currentPoint,
        deltaX: currentPoint.x - startPoint.x,
        deltaY: currentPoint.y - startPoint.y,
        distance,
        duration: Date.now() - startPoint.timestamp,
        velocity: distance / (Date.now() - startPoint.timestamp)
      };

      this.emit('drag', gestureEvent);
    }
  }

  /**
   * 롱 프레스 타이머 시작
   */
  private startLongPressTimer(touch: Touch): void {
    this.cancelLongPressTimer();

    const startPoint = this.touchStartPoints.get(touch.identifier);
    if (!startPoint) return;

    this.longPressTimer = window.setTimeout(() => {
      const gestureEvent: GestureEvent = {
        type: 'longpress',
        startPoint,
        endPoint: startPoint,
        deltaX: 0,
        deltaY: 0,
        distance: 0,
        duration: this.config.longPressMinDuration,
        velocity: 0
      };

      this.emit('longpress', gestureEvent);
      this.longPressTimer = null;
    }, this.config.longPressMinDuration);
  }

  /**
   * 롱 프레스 타이머 취소
   */
  private cancelLongPressTimer(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /**
   * 두 점 사이 거리 계산
   */
  private calculateDistance(point1: TouchPoint, point2: TouchPoint): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<GestureConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 현재 설정 가져오기
   */
  getConfig(): GestureConfig {
    return { ...this.config };
  }

  /**
   * 제스처 활성 상태 확인
   */
  isActive(): boolean {
    return this.isGestureActive;
  }

  /**
   * 정리
   */
  destroy(): void {
    this.cancelLongPressTimer();
    this.touchStartPoints.clear();
    this.removeAllListeners();
  }
}
