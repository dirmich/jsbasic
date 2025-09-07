/**
 * 브라우저 호환성 검사 및 폴리필
 * 다양한 브라우저에서의 호환성을 보장합니다.
 */

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  os: string;
  mobile: boolean;
}

export interface FeatureSupport {
  webAssembly: boolean;
  serviceWorker: boolean;
  webWorkers: boolean;
  localStorage: boolean;
  indexedDB: boolean;
  webGL: boolean;
  audioContext: boolean;
  performance: boolean;
  memory: boolean;
  es6Modules: boolean;
  promises: boolean;
}

export class BrowserSupport {
  private browserInfo: BrowserInfo;
  private featureSupport: FeatureSupport;

  constructor() {
    this.browserInfo = this.detectBrowser();
    this.featureSupport = this.checkFeatureSupport();
    this.applyPolyfills();
  }

  /**
   * 브라우저 정보 감지
   */
  private detectBrowser(): BrowserInfo {
    const ua = navigator.userAgent;
    const platform = navigator.platform;
    
    let name = 'Unknown';
    let version = 'Unknown';
    let engine = 'Unknown';
    
    // Chrome
    if (ua.includes('Chrome') && !ua.includes('Edge')) {
      name = 'Chrome';
      const match = ua.match(/Chrome\/(\d+\.\d+)/);
      version = match && match[1] ? match[1] : 'Unknown';
      engine = 'Blink';
    }
    // Firefox
    else if (ua.includes('Firefox')) {
      name = 'Firefox';
      const match = ua.match(/Firefox\/(\d+\.\d+)/);
      version = match && match[1] ? match[1] : 'Unknown';
      engine = 'Gecko';
    }
    // Safari
    else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      name = 'Safari';
      const match = ua.match(/Version\/(\d+\.\d+)/);
      version = match && match[1] ? match[1] : 'Unknown';
      engine = 'WebKit';
    }
    // Edge
    else if (ua.includes('Edge')) {
      name = 'Edge';
      const match = ua.match(/Edge\/(\d+\.\d+)/);
      version = match && match[1] ? match[1] : 'Unknown';
      engine = 'EdgeHTML';
    }
    // IE
    else if (ua.includes('Trident') || ua.includes('MSIE')) {
      name = 'Internet Explorer';
      const match = ua.match(/(?:MSIE |rv:)(\d+\.\d+)/);
      version = match && match[1] ? match[1] : 'Unknown';
      engine = 'Trident';
    }

    const os = this.detectOS(platform, ua);
    const mobile = /Mobi|Android/i.test(ua);

    return { name, version, engine, os, mobile };
  }

  /**
   * 운영체제 감지
   */
  private detectOS(platform: string, ua: string): string {
    if (platform.includes('Win')) return 'Windows';
    if (platform.includes('Mac')) return 'macOS';
    if (platform.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
  }

  /**
   * 기능 지원 확인
   */
  private checkFeatureSupport(): FeatureSupport {
    return {
      webAssembly: typeof WebAssembly !== 'undefined',
      serviceWorker: 'serviceWorker' in navigator,
      webWorkers: typeof Worker !== 'undefined',
      localStorage: this.testLocalStorage(),
      indexedDB: 'indexedDB' in window,
      webGL: this.testWebGL(),
      audioContext: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
      performance: 'performance' in window,
      memory: 'memory' in performance,
      es6Modules: this.testES6Modules(),
      promises: typeof Promise !== 'undefined'
    };
  }

  /**
   * LocalStorage 테스트
   */
  private testLocalStorage(): boolean {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * WebGL 테스트
   */
  private testWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch {
      return false;
    }
  }

  /**
   * ES6 모듈 지원 테스트
   */
  private testES6Modules(): boolean {
    const script = document.createElement('script');
    return 'noModule' in script;
  }

  /**
   * 폴리필 적용
   */
  private applyPolyfills(): void {
    // Promise 폴리필
    if (!this.featureSupport.promises) {
      this.loadPromisePolyfill();
    }

    // requestAnimationFrame 폴리필
    this.polyfillRequestAnimationFrame();

    // Performance.now 폴리필
    if (!this.featureSupport.performance) {
      this.polyfillPerformanceNow();
    }

    // Array.from 폴리필
    this.polyfillArrayFrom();

    // Object.assign 폴리필
    this.polyfillObjectAssign();
  }

  /**
   * Promise 폴리필 로드
   */
  private loadPromisePolyfill(): void {
    console.log('🔄 Loading Promise polyfill...');
    // 간단한 Promise 폴리필 (실제로는 외부 라이브러리 사용 권장)
    (window as any).Promise = class SimplePromise {
      constructor(executor: (resolve: Function, reject: Function) => void) {
        // 기본적인 Promise 구현
        console.warn('Using basic Promise polyfill');
      }
    };
  }

  /**
   * requestAnimationFrame 폴리필
   */
  private polyfillRequestAnimationFrame(): void {
    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = (callback: FrameRequestCallback) => {
        return window.setTimeout(callback, 16);
      };
    }

    if (!window.cancelAnimationFrame) {
      window.cancelAnimationFrame = (id: number) => {
        window.clearTimeout(id);
      };
    }
  }

  /**
   * Performance.now 폴리필
   */
  private polyfillPerformanceNow(): void {
    if (!window.performance) {
      (window as any).performance = {};
    }

    if (!window.performance.now) {
      const start = Date.now();
      window.performance.now = () => Date.now() - start;
    }
  }

  /**
   * Array.from 폴리필
   */
  private polyfillArrayFrom(): void {
    if (!Array.from) {
      Array.from = function<T, U>(
        arrayLike: ArrayLike<T>, 
        mapFn?: (v: T, k: number) => U,
        thisArg?: any
      ): U[] {
        const result: U[] = [];
        const length = arrayLike.length;
        
        for (let i = 0; i < length; i++) {
          const value = arrayLike[i];
          if (mapFn && value !== undefined) {
            result[i] = mapFn.call(thisArg, value, i);
          } else {
            result[i] = value as unknown as U;
          }
        }
        
        return result;
      };
    }
  }

  /**
   * Object.assign 폴리필
   */
  private polyfillObjectAssign(): void {
    if (!Object.assign) {
      Object.assign = function(target: any, ...sources: any[]): any {
        if (target == null) {
          throw new TypeError('Cannot convert undefined or null to object');
        }

        const to = Object(target);

        for (let i = 0; i < sources.length; i++) {
          const nextSource = sources[i];
          if (nextSource != null) {
            for (const nextKey in nextSource) {
              if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                to[nextKey] = nextSource[nextKey];
              }
            }
          }
        }

        return to;
      };
    }
  }

  /**
   * 브라우저 정보 반환
   */
  getBrowserInfo(): BrowserInfo {
    return { ...this.browserInfo };
  }

  /**
   * 기능 지원 정보 반환
   */
  getFeatureSupport(): FeatureSupport {
    return { ...this.featureSupport };
  }

  /**
   * 브라우저 호환성 확인
   */
  isSupported(): boolean {
    // 최소 요구사항 확인
    const requirements = {
      localStorage: true,
      performance: true,
      es6Modules: false, // 선택적
      promises: true
    };

    for (const [feature, required] of Object.entries(requirements)) {
      if (required && !this.featureSupport[feature as keyof FeatureSupport]) {
        return false;
      }
    }

    return true;
  }

  /**
   * 호환성 경고 표시
   */
  showCompatibilityWarning(): void {
    if (!this.isSupported()) {
      const message = `
        ⚠️ 브라우저 호환성 경고
        
        현재 브라우저: ${this.browserInfo.name} ${this.browserInfo.version}
        
        일부 기능이 제대로 작동하지 않을 수 있습니다.
        최신 버전의 Chrome, Firefox, Safari를 사용하시기 바랍니다.
      `;
      
      console.warn(message);
      
      // 사용자에게 경고 표시
      if (confirm('브라우저 호환성 문제가 감지되었습니다. 계속 진행하시겠습니까?')) {
        console.log('사용자가 호환성 경고를 승인했습니다.');
      }
    }
  }

  /**
   * 성능 권장사항 제공
   */
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.browserInfo.mobile) {
      recommendations.push('모바일 환경에서는 성능이 제한될 수 있습니다.');
    }

    if (!this.featureSupport.webWorkers) {
      recommendations.push('Web Workers를 지원하지 않아 일부 백그라운드 작업이 제한됩니다.');
    }

    if (!this.featureSupport.memory) {
      recommendations.push('메모리 사용량 모니터링이 지원되지 않습니다.');
    }

    if (this.browserInfo.name === 'Internet Explorer') {
      recommendations.push('Internet Explorer는 성능과 호환성에 제한이 있습니다.');
    }

    return recommendations;
  }

  /**
   * 호환성 리포트 생성
   */
  generateCompatibilityReport(): string {
    const info = this.getBrowserInfo();
    const features = this.getFeatureSupport();
    const recommendations = this.getPerformanceRecommendations();

    const report = {
      timestamp: new Date().toISOString(),
      browser: info,
      features,
      supported: this.isSupported(),
      recommendations
    };

    return JSON.stringify(report, null, 2);
  }
}

// 전역 브라우저 지원 인스턴스
export const browserSupport = new BrowserSupport();