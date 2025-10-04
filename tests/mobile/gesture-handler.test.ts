/**
 * GestureHandler 포괄적 테스트
 * 터치, 제스처 인식 기능 검증
 */

import { describe, test, expect, beforeEach, jest } from 'bun:test';
import { Window } from 'happy-dom';
import { GestureHandler } from '../../src/mobile/gesture-handler.js';
import type { GestureEvent } from '../../src/mobile/types.js';

// Happy-DOM 설정
const setupDOM = () => {
  const window = new Window();
  const document = window.document;

  (globalThis as any).window = window;
  (globalThis as any).document = document;

  document.body.innerHTML = '<div id="test-element"></div>';

  return {
    window,
    document,
    element: document.getElementById('test-element') as HTMLElement
  };
};

// 터치 이벤트 생성 헬퍼
const createTouch = (id: number, x: number, y: number): Touch => {
  return {
    identifier: id,
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y,
    pageX: x,
    pageY: y,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    force: 1,
    target: document.getElementById('test-element')!
  } as Touch;
};

const createTouchEvent = (
  type: string,
  touches: Touch[],
  changedTouches: Touch[] = touches
): TouchEvent => {
  const event = new Event(type) as any;
  event.touches = touches;
  event.changedTouches = changedTouches;
  event.targetTouches = touches;
  event.preventDefault = jest.fn();
  return event as TouchEvent;
};

describe('GestureHandler - 초기화', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('기본 설정으로 초기화', () => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    const config = handler.getConfig();

    expect(config.tapMaxDuration).toBe(300);
    expect(config.doubleTapMaxInterval).toBe(300);
    expect(config.longPressMinDuration).toBe(500);
    expect(config.swipeMinDistance).toBe(50);
    expect(config.swipeMaxDuration).toBe(300);
    expect(config.pinchMinScale).toBe(0.1);
    expect(config.dragMinDistance).toBe(10);
  });

  test('사용자 정의 설정으로 초기화', () => {
    const { element } = setupDOM();
    const customConfig = {
      tapMaxDuration: 200,
      swipeMinDistance: 100,
      longPressMinDuration: 1000
    };

    const handler = new GestureHandler(element, customConfig);
    const config = handler.getConfig();

    expect(config.tapMaxDuration).toBe(200);
    expect(config.swipeMinDistance).toBe(100);
    expect(config.longPressMinDuration).toBe(1000);
    // 지정하지 않은 값은 기본값 유지
    expect(config.doubleTapMaxInterval).toBe(300);
  });

  test('설정 업데이트', () => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    handler.updateConfig({ tapMaxDuration: 400 });

    const config = handler.getConfig();
    expect(config.tapMaxDuration).toBe(400);
  });
});

describe('GestureHandler - 탭 제스처', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('단일 탭 감지', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    handler.on('tap', (event: GestureEvent) => {
      expect(event.type).toBe('tap');
      expect(event.startPoint).toBeDefined();
      expect(event.endPoint).toBeDefined();
      expect(event.distance).toBeLessThan(10);
      done();
    });

    // 터치 시작
    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    // 즉시 터치 종료 (탭)
    setTimeout(() => {
      element.dispatchEvent(createTouchEvent('touchend', [], [touch]));
    }, 50);
  });

  test('더블 탭 감지', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    let tapCount = 0;

    handler.on('tap', () => {
      tapCount++;
    });

    handler.on('doubletap', (event: GestureEvent) => {
      expect(event.type).toBe('doubletap');
      expect(tapCount).toBe(1); // 첫 번째 탭만 발생
      done();
    });

    // 첫 번째 탭
    const touch1 = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch1]));
    setTimeout(() => {
      element.dispatchEvent(createTouchEvent('touchend', [], [touch1]));

      // 두 번째 탭 (짧은 간격)
      setTimeout(() => {
        const touch2 = createTouch(2, 102, 102);
        element.dispatchEvent(createTouchEvent('touchstart', [touch2]));
        setTimeout(() => {
          element.dispatchEvent(createTouchEvent('touchend', [], [touch2]));
        }, 50);
      }, 100);
    }, 50);
  });

  test('더블 탭 실패 - 시간 초과', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element, { doubleTapMaxInterval: 200 });

    let doubleTapFired = false;

    handler.on('doubletap', () => {
      doubleTapFired = true;
    });

    // 첫 번째 탭
    const touch1 = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch1]));
    setTimeout(() => {
      element.dispatchEvent(createTouchEvent('touchend', [], [touch1]));

      // 두 번째 탭 (긴 간격 - 300ms)
      setTimeout(() => {
        const touch2 = createTouch(2, 100, 100);
        element.dispatchEvent(createTouchEvent('touchstart', [touch2]));
        setTimeout(() => {
          element.dispatchEvent(createTouchEvent('touchend', [], [touch2]));

          // 더블 탭이 발생하지 않았는지 확인
          setTimeout(() => {
            expect(doubleTapFired).toBe(false);
            done();
          }, 50);
        }, 50);
      }, 300);
    }, 50);
  });

  test('더블 탭 실패 - 거리 초과', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    let doubleTapFired = false;

    handler.on('doubletap', () => {
      doubleTapFired = true;
    });

    // 첫 번째 탭
    const touch1 = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch1]));
    setTimeout(() => {
      element.dispatchEvent(createTouchEvent('touchend', [], [touch1]));

      // 두 번째 탭 (멀리 떨어진 위치)
      setTimeout(() => {
        const touch2 = createTouch(2, 200, 200);
        element.dispatchEvent(createTouchEvent('touchstart', [touch2]));
        setTimeout(() => {
          element.dispatchEvent(createTouchEvent('touchend', [], [touch2]));

          setTimeout(() => {
            expect(doubleTapFired).toBe(false);
            done();
          }, 50);
        }, 50);
      }, 100);
    }, 50);
  });
});

describe('GestureHandler - 롱 프레스', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('롱 프레스 감지', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element, { longPressMinDuration: 300 });

    handler.on('longpress', (event: GestureEvent) => {
      expect(event.type).toBe('longpress');
      expect(event.duration).toBeGreaterThanOrEqual(300);
      done();
    });

    // 터치 시작
    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    // 롱 프레스가 발생할 때까지 대기
  });

  test('롱 프레스 취소 - 움직임', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element, { longPressMinDuration: 300 });

    let longPressFired = false;

    handler.on('longpress', () => {
      longPressFired = true;
    });

    // 터치 시작
    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    // 움직임 발생
    setTimeout(() => {
      const movedTouch = createTouch(1, 120, 120);
      element.dispatchEvent(createTouchEvent('touchmove', [movedTouch]));

      // 롱 프레스 시간 이후에도 발생하지 않았는지 확인
      setTimeout(() => {
        expect(longPressFired).toBe(false);
        done();
      }, 400);
    }, 100);
  });

  test('롱 프레스 취소 - 조기 종료', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element, { longPressMinDuration: 500 });

    let longPressFired = false;

    handler.on('longpress', () => {
      longPressFired = true;
    });

    // 터치 시작
    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    // 조기 종료
    setTimeout(() => {
      element.dispatchEvent(createTouchEvent('touchend', [], [touch]));

      setTimeout(() => {
        expect(longPressFired).toBe(false);
        done();
      }, 600);
    }, 200);
  });
});

describe('GestureHandler - 스와이프', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('스와이프 - 오른쪽', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    handler.on('swipe', (event: GestureEvent) => {
      expect(event.type).toBe('swipe');
      expect(event.direction).toBe('right');
      expect(event.distance).toBeGreaterThanOrEqual(50);
      expect(event.velocity).toBeGreaterThan(0);
      done();
    });

    // 스와이프 시작
    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    // 빠르게 오른쪽으로 이동 후 종료
    setTimeout(() => {
      const endTouch = createTouch(1, 200, 100);
      element.dispatchEvent(createTouchEvent('touchend', [], [endTouch]));
    }, 150);
  });

  test('스와이프 - 왼쪽', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    handler.on('swipe:left', (event: GestureEvent) => {
      expect(event.direction).toBe('left');
      done();
    });

    const touch = createTouch(1, 200, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    setTimeout(() => {
      const endTouch = createTouch(1, 100, 100);
      element.dispatchEvent(createTouchEvent('touchend', [], [endTouch]));
    }, 150);
  });

  test('스와이프 - 위', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    handler.on('swipe:up', (event: GestureEvent) => {
      expect(event.direction).toBe('up');
      done();
    });

    const touch = createTouch(1, 100, 200);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    setTimeout(() => {
      const endTouch = createTouch(1, 100, 100);
      element.dispatchEvent(createTouchEvent('touchend', [], [endTouch]));
    }, 150);
  });

  test('스와이프 - 아래', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    handler.on('swipe:down', (event: GestureEvent) => {
      expect(event.direction).toBe('down');
      done();
    });

    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    setTimeout(() => {
      const endTouch = createTouch(1, 100, 200);
      element.dispatchEvent(createTouchEvent('touchend', [], [endTouch]));
    }, 150);
  });

  test('스와이프 실패 - 거리 부족', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element, { swipeMinDistance: 100 });

    let swipeFired = false;

    handler.on('swipe', () => {
      swipeFired = true;
    });

    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    setTimeout(() => {
      const endTouch = createTouch(1, 130, 100); // 30px만 이동
      element.dispatchEvent(createTouchEvent('touchend', [], [endTouch]));

      setTimeout(() => {
        expect(swipeFired).toBe(false);
        done();
      }, 50);
    }, 150);
  });

  test('스와이프 실패 - 시간 초과', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element, { swipeMaxDuration: 200 });

    let swipeFired = false;

    handler.on('swipe', () => {
      swipeFired = true;
    });

    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    setTimeout(() => {
      const endTouch = createTouch(1, 200, 100);
      element.dispatchEvent(createTouchEvent('touchend', [], [endTouch]));

      setTimeout(() => {
        expect(swipeFired).toBe(false);
        done();
      }, 50);
    }, 350); // 350ms (초과)
  });

  test('대각선 스와이프 - 수평 우선', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    handler.on('swipe', (event: GestureEvent) => {
      // deltaX가 deltaY보다 크면 수평 방향
      expect(['left', 'right']).toContain(event.direction!);
      done();
    });

    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    setTimeout(() => {
      const endTouch = createTouch(1, 180, 130); // 수평 80px, 수직 30px
      element.dispatchEvent(createTouchEvent('touchend', [], [endTouch]));
    }, 150);
  });

  test('대각선 스와이프 - 수직 우선', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    handler.on('swipe', (event: GestureEvent) => {
      // deltaY가 deltaX보다 크면 수직 방향
      expect(['up', 'down']).toContain(event.direction!);
      done();
    });

    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    setTimeout(() => {
      const endTouch = createTouch(1, 130, 180); // 수평 30px, 수직 80px
      element.dispatchEvent(createTouchEvent('touchend', [], [endTouch]));
    }, 150);
  });
});

describe('GestureHandler - 핀치', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('핀치 줌 인', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    handler.on('pinch', (event: GestureEvent) => {
      expect(event.type).toBe('pinch');
      expect(event.scale).toBeGreaterThan(1);
      done();
    });

    // 두 손가락 터치 시작
    const touch1 = createTouch(1, 100, 100);
    const touch2 = createTouch(2, 150, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch1, touch2]));

    // 두 손가락이 벌어짐
    setTimeout(() => {
      const movedTouch1 = createTouch(1, 80, 100);
      const movedTouch2 = createTouch(2, 180, 100);
      element.dispatchEvent(createTouchEvent('touchmove', [movedTouch1, movedTouch2]));
    }, 50);
  });

  test('핀치 줌 아웃', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    handler.on('pinch', (event: GestureEvent) => {
      expect(event.scale).toBeLessThan(1);
      done();
    });

    // 두 손가락 터치 시작 (멀리 떨어짐)
    const touch1 = createTouch(1, 50, 100);
    const touch2 = createTouch(2, 200, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch1, touch2]));

    // 두 손가락이 가까워짐
    setTimeout(() => {
      const movedTouch1 = createTouch(1, 100, 100);
      const movedTouch2 = createTouch(2, 150, 100);
      element.dispatchEvent(createTouchEvent('touchmove', [movedTouch1, movedTouch2]));
    }, 50);
  });

  test('핀치 실패 - 스케일 변화 미미', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element, { pinchMinScale: 0.2 });

    let pinchFired = false;

    handler.on('pinch', () => {
      pinchFired = true;
    });

    const touch1 = createTouch(1, 100, 100);
    const touch2 = createTouch(2, 150, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch1, touch2]));

    setTimeout(() => {
      // 작은 변화 (5px만 벌어짐)
      const movedTouch1 = createTouch(1, 98, 100);
      const movedTouch2 = createTouch(2, 153, 100);
      element.dispatchEvent(createTouchEvent('touchmove', [movedTouch1, movedTouch2]));

      setTimeout(() => {
        expect(pinchFired).toBe(false);
        done();
      }, 50);
    }, 50);
  });

  test('핀치 - 세 손가락 이상은 무시', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    let pinchFired = false;

    handler.on('pinch', () => {
      pinchFired = true;
    });

    // 세 손가락
    const touch1 = createTouch(1, 100, 100);
    const touch2 = createTouch(2, 150, 100);
    const touch3 = createTouch(3, 200, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch1, touch2, touch3]));

    setTimeout(() => {
      const movedTouch1 = createTouch(1, 80, 100);
      const movedTouch2 = createTouch(2, 180, 100);
      const movedTouch3 = createTouch(3, 220, 100);
      element.dispatchEvent(createTouchEvent('touchmove', [movedTouch1, movedTouch2, movedTouch3]));

      setTimeout(() => {
        expect(pinchFired).toBe(false);
        done();
      }, 50);
    }, 50);
  });
});

describe('GestureHandler - 드래그', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('드래그 감지', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    handler.on('drag', (event: GestureEvent) => {
      expect(event.type).toBe('drag');
      expect(event.distance).toBeGreaterThanOrEqual(10);
      expect(event.deltaX).toBeDefined();
      expect(event.deltaY).toBeDefined();
      done();
    });

    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    setTimeout(() => {
      const movedTouch = createTouch(1, 130, 130);
      element.dispatchEvent(createTouchEvent('touchmove', [movedTouch]));
    }, 50);
  });

  test('드래그 실패 - 거리 부족', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element, { dragMinDistance: 20 });

    let dragFired = false;

    handler.on('drag', () => {
      dragFired = true;
    });

    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    setTimeout(() => {
      const movedTouch = createTouch(1, 105, 105); // 7px 이동
      element.dispatchEvent(createTouchEvent('touchmove', [movedTouch]));

      setTimeout(() => {
        expect(dragFired).toBe(false);
        done();
      }, 50);
    }, 50);
  });

  test('드래그 속도 계산', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    handler.on('drag', (event: GestureEvent) => {
      expect(event.velocity).toBeGreaterThan(0);
      expect(event.duration).toBeGreaterThan(0);
      done();
    });

    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    setTimeout(() => {
      const movedTouch = createTouch(1, 150, 100);
      element.dispatchEvent(createTouchEvent('touchmove', [movedTouch]));
    }, 100);
  });
});

describe('GestureHandler - 멀티터치', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('두 손가락 터치 감지', () => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    const touch1 = createTouch(1, 100, 100);
    const touch2 = createTouch(2, 150, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch1, touch2]));

    expect(handler.isActive()).toBe(true);
  });

  test('세 손가락 터치 감지', () => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    const touch1 = createTouch(1, 100, 100);
    const touch2 = createTouch(2, 150, 100);
    const touch3 = createTouch(3, 200, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch1, touch2, touch3]));

    expect(handler.isActive()).toBe(true);
  });

  test('터치 포인트 추적', () => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    const touch1 = createTouch(1, 100, 100);
    const touch2 = createTouch(2, 150, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch1, touch2]));

    // 내부 상태 확인 (private이지만 테스트를 위해 any 사용)
    const touchPoints = (handler as any).touchStartPoints;
    expect(touchPoints.size).toBe(2);
    expect(touchPoints.has(1)).toBe(true);
    expect(touchPoints.has(2)).toBe(true);
  });
});

describe('GestureHandler - 터치 취소', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('touchcancel 이벤트 처리', () => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    expect(handler.isActive()).toBe(true);

    element.dispatchEvent(createTouchEvent('touchcancel', [], [touch]));

    expect(handler.isActive()).toBe(false);
  });

  test('touchcancel 시 롱 프레스 타이머 취소', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element, { longPressMinDuration: 300 });

    let longPressFired = false;

    handler.on('longpress', () => {
      longPressFired = true;
    });

    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    setTimeout(() => {
      element.dispatchEvent(createTouchEvent('touchcancel', [], [touch]));

      setTimeout(() => {
        expect(longPressFired).toBe(false);
        done();
      }, 400);
    }, 100);
  });
});

describe('GestureHandler - 엣지 케이스', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('매우 빠른 스와이프', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    handler.on('swipe', (event: GestureEvent) => {
      expect(event.velocity).toBeGreaterThan(1);
      done();
    });

    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    setTimeout(() => {
      const endTouch = createTouch(1, 300, 100);
      element.dispatchEvent(createTouchEvent('touchend', [], [endTouch]));
    }, 50); // 매우 빠름
  });

  test('매우 느린 스와이프는 드래그로 처리', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element, { swipeMaxDuration: 300 });

    let swipeFired = false;

    handler.on('swipe', () => {
      swipeFired = true;
    });

    handler.on('drag', () => {
      done();
    });

    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    setTimeout(() => {
      const movedTouch = createTouch(1, 200, 100);
      element.dispatchEvent(createTouchEvent('touchmove', [movedTouch]));

      setTimeout(() => {
        expect(swipeFired).toBe(false);
      }, 50);
    }, 100);
  });

  test('경계값 - 정확히 임계값만큼 이동', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element, { swipeMinDistance: 50 });

    handler.on('swipe', (event: GestureEvent) => {
      expect(event.distance).toBeGreaterThanOrEqual(50);
      done();
    });

    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    setTimeout(() => {
      const endTouch = createTouch(1, 150, 100); // 정확히 50px
      element.dispatchEvent(createTouchEvent('touchend', [], [endTouch]));
    }, 150);
  });

  test('동시에 여러 제스처 시도 - 마지막 제스처만 유효', (done) => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    const events: string[] = [];

    handler.on('tap', () => events.push('tap'));
    handler.on('swipe', () => events.push('swipe'));
    handler.on('drag', () => events.push('drag'));

    // 스와이프 제스처
    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    setTimeout(() => {
      const endTouch = createTouch(1, 200, 100);
      element.dispatchEvent(createTouchEvent('touchend', [], [endTouch]));

      setTimeout(() => {
        // 스와이프만 발생해야 함
        expect(events).toContain('swipe');
        expect(events).not.toContain('tap');
        done();
      }, 50);
    }, 150);
  });
});

describe('GestureHandler - 정리', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('destroy 호출 시 모든 리스너 제거', () => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    const tapHandler = jest.fn();
    handler.on('tap', tapHandler);

    handler.destroy();

    // 이벤트 발생
    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));
    setTimeout(() => {
      element.dispatchEvent(createTouchEvent('touchend', [], [touch]));
    }, 50);

    // 리스너가 호출되지 않아야 함
    setTimeout(() => {
      expect(tapHandler).not.toHaveBeenCalled();
    }, 100);
  });

  test('destroy 호출 시 롱 프레스 타이머 취소', () => {
    const { element } = setupDOM();
    const handler = new GestureHandler(element);

    const touch = createTouch(1, 100, 100);
    element.dispatchEvent(createTouchEvent('touchstart', [touch]));

    handler.destroy();

    // 타이머가 null이어야 함
    expect((handler as any).longPressTimer).toBeNull();
  });
});
