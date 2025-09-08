/**
 * 모바일 환경 최적화 시스템
 * 모바일 기기에서의 성능 및 사용성을 최적화합니다.
 */

import { EventEmitter } from '../utils/events.js';

export interface MobileConfiguration {
  enableTouchInput: boolean;
  optimizeForBattery: boolean;
  reduceAnimations: boolean;
  compactLayout: boolean;
  adaptiveFontSize: boolean;
  enableVibration: boolean;
  networkOptimization: boolean;
}

export interface MobileCapabilities {
  touchSupport: boolean;
  vibrationSupport: boolean;
  orientationSupport: boolean;
  networkInfo: boolean;
  batteryInfo: boolean;
  deviceMemory: boolean;
  hardwareConcurrency: boolean;
}

export interface MobileMetrics {
  screenSize: string;
  pixelRatio: number;
  orientation: 'portrait' | 'landscape';
  networkSpeed: 'slow' | 'medium' | 'fast';
  batteryLevel: number;
  isCharging: boolean;
  deviceMemory: number;
  cpuCores: number;
}

/**
 * 모바일 최적화 관리자
 */
export class MobileOptimizer extends EventEmitter {
  private config: MobileConfiguration;
  private capabilities: MobileCapabilities;
  private metrics: MobileMetrics;
  private isOptimized: boolean = false;

  constructor(config?: Partial<MobileConfiguration>) {
    super();
    
    this.config = {
      enableTouchInput: true,
      optimizeForBattery: true,
      reduceAnimations: false,
      compactLayout: false,
      adaptiveFontSize: true,
      enableVibration: false,
      networkOptimization: true,
      ...config
    };

    this.capabilities = this.detectCapabilities();
    this.metrics = this.collectMetrics();
    
    this.setupEventListeners();
  }

  /**
   * 모바일 기능 감지
   */
  private detectCapabilities(): MobileCapabilities {
    const nav = globalThis.navigator || {};
    const win = globalThis.window || {};

    return {
      touchSupport: 'ontouchstart' in win || (nav as any).maxTouchPoints > 0,
      vibrationSupport: 'vibrate' in nav,
      orientationSupport: 'orientation' in win || 'onorientationchange' in win,
      networkInfo: 'connection' in nav || 'mozConnection' in nav || 'webkitConnection' in nav,
      batteryInfo: 'getBattery' in nav,
      deviceMemory: 'deviceMemory' in nav,
      hardwareConcurrency: 'hardwareConcurrency' in nav
    };
  }

  /**
   * 모바일 메트릭 수집
   */
  private collectMetrics(): MobileMetrics {
    const win = globalThis.window || {};
    const nav = globalThis.navigator || {};
    const screen = win.screen || {};

    let screenSize = 'unknown';
    if (screen.width && screen.height) {
      const width = Math.min(screen.width, screen.height);
      const height = Math.max(screen.width, screen.height);
      
      
      if (width < 480) {
        screenSize = 'small'; // 소형 스마트폰
      } else if (width < 768) {
        screenSize = 'medium'; // 대형 스마트폰
      } else if (width < 1024) {
        screenSize = 'tablet'; // 태블릿
      } else {
        screenSize = 'desktop'; // 데스크톱
      }
    }

    const connection = (nav as any).connection || 
                      (nav as any).mozConnection || 
                      (nav as any).webkitConnection;
                      
    let networkSpeed: 'slow' | 'medium' | 'fast' = 'medium';
    if (connection) {
      const effectiveType = connection.effectiveType || connection.type || '';
      if (effectiveType.includes('slow') || effectiveType === '2g') {
        networkSpeed = 'slow';
      } else if (effectiveType.includes('3g')) {
        networkSpeed = 'medium';
      } else if (effectiveType.includes('4g') || effectiveType.includes('5g')) {
        networkSpeed = 'fast';
      }
    }

    return {
      screenSize,
      pixelRatio: win.devicePixelRatio || 1,
      orientation: (screen.width || 0) > (screen.height || 0) ? 'landscape' : 'portrait',
      networkSpeed,
      batteryLevel: 1.0, // 기본값, 실제로는 배터리 API에서 가져옴
      isCharging: true, // 기본값
      deviceMemory: (nav as any).deviceMemory || 4, // 기본 4GB
      cpuCores: (nav as any).hardwareConcurrency || 4 // 기본 4코어
    };
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    const win = globalThis.window as typeof window | undefined;
    if (!win) return;

    // 화면 방향 변경 감지
    if (this.capabilities.orientationSupport) {
      const orientationHandler = () => {
        this.updateOrientation();
        this.emit('orientationChange', this.metrics.orientation);
      };

      if ('onorientationchange' in win) {
        win.addEventListener('orientationchange', orientationHandler);
      } else if ((win as any).screen && 'orientation' in (win as any).screen && (win as any).screen.orientation) {
        (win as any).screen.orientation.addEventListener('change', orientationHandler);
      }
    }

    // 배터리 정보 업데이트
    if (this.capabilities.batteryInfo) {
      this.updateBatteryInfo();
    }

    // 네트워크 정보 업데이트
    if (this.capabilities.networkInfo) {
      const connection = (navigator as any).connection;
      if (connection && connection.addEventListener) {
        connection.addEventListener('change', () => {
          this.updateNetworkInfo();
        });
      }
    }

    // 화면 크기 변경 감지
    win.addEventListener('resize', () => {
      this.updateScreenMetrics();
      this.emit('screenResize', {
        width: win.innerWidth,
        height: win.innerHeight
      });
    });
  }

  /**
   * 모바일 최적화 적용
   */
  optimize(): void {
    if (this.isOptimized) return;

    console.log('🔧 Applying mobile optimizations...');

    // 터치 입력 최적화
    if (this.config.enableTouchInput && this.capabilities.touchSupport) {
      this.optimizeTouchInput();
    }

    // 배터리 최적화
    if (this.config.optimizeForBattery && this.metrics.batteryLevel < 0.3) {
      this.enableBatteryOptimization();
    }

    // 애니메이션 최적화
    if (this.config.reduceAnimations) {
      this.reduceAnimations();
    }

    // 레이아웃 최적화
    if (this.config.compactLayout && this.metrics.screenSize === 'small') {
      this.enableCompactLayout();
    }

    // 폰트 크기 적응
    if (this.config.adaptiveFontSize) {
      this.adaptFontSize();
    }

    // 네트워크 최적화
    if (this.config.networkOptimization && this.metrics.networkSpeed === 'slow') {
      this.enableNetworkOptimization();
    }

    this.isOptimized = true;
    this.emit('optimized', this.getOptimizationSummary());
    
    console.log('✅ Mobile optimizations applied');
  }

  /**
   * 터치 입력 최적화
   */
  private optimizeTouchInput(): void {
    const style = this.createOrGetStyleElement('mobile-touch-optimizations');
    
    style.textContent = `
      /* 터치 최적화 스타일 */
      .mobile-optimized * {
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      
      .mobile-optimized input,
      .mobile-optimized textarea {
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
      }
      
      .mobile-optimized button,
      .mobile-optimized .clickable {
        min-height: 44px;
        min-width: 44px;
        padding: 12px;
        touch-action: manipulation;
      }
    `;

    console.log('🔧 Touch input optimizations applied');
  }

  /**
   * 배터리 최적화
   */
  private enableBatteryOptimization(): void {
    const style = this.createOrGetStyleElement('mobile-battery-optimizations');
    
    style.textContent = `
      /* 배터리 최적화 스타일 */
      .battery-optimized * {
        animation-duration: 0.01ms !important;
        animation-delay: 0.01ms !important;
        transition-duration: 0.01ms !important;
        transition-delay: 0.01ms !important;
      }
      
      .battery-optimized {
        filter: brightness(0.8);
      }
    `;

    // 화면 밝기 감소 및 애니메이션 비활성화
    const doc = globalThis.document;
    if (doc?.body) {
      // Work around Happy-DOM classList issue by using className directly
      const currentClasses = doc.body.className ? doc.body.className.split(' ') : [];
      if (!currentClasses.includes('battery-optimized')) {
        currentClasses.push('battery-optimized');
        doc.body.className = currentClasses.join(' ');
      }
    }
    
    console.log('🔋 Battery optimizations enabled');
  }

  /**
   * 애니메이션 감소
   */
  private reduceAnimations(): void {
    const style = this.createOrGetStyleElement('mobile-animation-reduction');
    
    style.textContent = `
      /* 애니메이션 감소 */
      .reduced-motion * {
        animation-duration: 0.1ms !important;
        animation-delay: 0ms !important;
        transition-duration: 0.1ms !important;
        transition-delay: 0ms !important;
      }
    `;

    const doc = globalThis.document;
    if (doc?.body) {
      // Work around Happy-DOM classList issue by using className directly
      const currentClasses = doc.body.className ? doc.body.className.split(' ') : [];
      if (!currentClasses.includes('reduced-motion')) {
        currentClasses.push('reduced-motion');
        doc.body.className = currentClasses.join(' ');
      }
      console.log('🎬 Animations reduced for mobile');
    } else {
      console.log('🎬 Animation reduction NOT applied - no body');
    }
  }

  /**
   * 컴팩트 레이아웃
   */
  private enableCompactLayout(): void {
    const style = this.createOrGetStyleElement('mobile-compact-layout');
    
    style.textContent = `
      /* 컴팩트 레이아웃 */
      .compact-layout {
        font-size: 14px;
        line-height: 1.4;
      }
      
      .compact-layout .terminal-output {
        padding: 8px;
        margin: 4px 0;
      }
      
      .compact-layout .system-info {
        font-size: 12px;
        padding: 4px;
      }
      
      .compact-layout button {
        padding: 8px 12px;
        font-size: 14px;
      }
    `;

    const doc = globalThis.document;
    if (doc?.body) {
      // Work around Happy-DOM classList issue by using className directly
      const currentClasses = doc.body.className ? doc.body.className.split(' ') : [];
      if (!currentClasses.includes('compact-layout')) {
        currentClasses.push('compact-layout');
        doc.body.className = currentClasses.join(' ');
      }
      console.log('📱 Compact layout enabled');
    } else {
      console.log('📱 Compact layout NOT enabled - no body');
    }
  }

  /**
   * 적응형 폰트 크기
   */
  private adaptFontSize(): void {
    const baseSize = this.metrics.screenSize === 'small' ? 14 : 
                     this.metrics.screenSize === 'medium' ? 16 : 18;
    
    const style = this.createOrGetStyleElement('mobile-adaptive-fonts');
    
    style.textContent = `
      /* 적응형 폰트 */
      .adaptive-fonts {
        font-size: ${baseSize}px;
      }
      
      .adaptive-fonts .terminal-output {
        font-size: ${Math.max(12, baseSize - 2)}px;
      }
      
      .adaptive-fonts .system-info {
        font-size: ${Math.max(10, baseSize - 4)}px;
      }
    `;

    const doc = globalThis.document;
    if (doc?.body) {
      // Work around Happy-DOM classList issue by using className directly
      const currentClasses = doc.body.className ? doc.body.className.split(' ') : [];
      if (!currentClasses.includes('adaptive-fonts')) {
        currentClasses.push('adaptive-fonts');
        doc.body.className = currentClasses.join(' ');
      }
      console.log(`📝 Adaptive font size set to ${baseSize}px`);
    } else {
      console.log(`📝 Adaptive font NOT applied - no body`);
    }
  }

  /**
   * 네트워크 최적화
   */
  private enableNetworkOptimization(): void {
    const doc = globalThis.document;
    if (doc?.querySelectorAll) {
      // 이미지 품질 감소
      const images = doc.querySelectorAll('img');
      images.forEach((img: any) => {
        if (img.src && !img.dataset?.optimized) {
          img.style.imageRendering = 'pixelated';
          img.dataset.optimized = 'true';
        }
      });
    }

    // 불필요한 애니메이션 제거
    this.reduceAnimations();
    
    console.log('🌐 Network optimizations enabled');
  }

  /**
   * 스타일 요소 생성 또는 가져오기
   */
  private createOrGetStyleElement(id: string): HTMLStyleElement {
    const doc = globalThis.document;
    if (!doc) {
      return { textContent: '' } as HTMLStyleElement;
    }

    let style = doc.getElementById(id) as HTMLStyleElement;
    if (!style) {
      style = doc.createElement('style');
      style.id = id;
      
      // Try to append to head, fall back to body if head doesn't exist
      if (doc.head) {
        doc.head.appendChild(style);
      } else if (doc.body) {
        doc.body.appendChild(style);
      } else {
        // In test environments, document might not have head/body ready
        // Create a temporary container
        const container = doc.querySelector('html') || doc;
        if (container && container.appendChild) {
          container.appendChild(style);
        }
      }
    }
    return style;
  }

  /**
   * 화면 방향 업데이트
   */
  private updateOrientation(): void {
    const win = globalThis.window;
    if (!win || !win.screen) return;

    this.metrics.orientation = win.screen.width > win.screen.height ? 'landscape' : 'portrait';
  }

  /**
   * 배터리 정보 업데이트
   */
  private async updateBatteryInfo(): Promise<void> {
    try {
      const nav = globalThis.navigator as any;
      if (nav.getBattery) {
        const battery = await nav.getBattery();
        this.metrics.batteryLevel = battery.level;
        this.metrics.isCharging = battery.charging;
        
        // 배터리 이벤트 리스너
        battery.addEventListener('levelchange', () => {
          this.metrics.batteryLevel = battery.level;
          this.emit('batteryChange', this.metrics.batteryLevel);
          
          // 배터리가 부족할 때 자동 최적화
          if (battery.level < 0.2 && !document.body.classList.contains('battery-optimized')) {
            this.enableBatteryOptimization();
          }
        });

        battery.addEventListener('chargingchange', () => {
          this.metrics.isCharging = battery.charging;
          this.emit('chargingChange', this.metrics.isCharging);
        });
      }
    } catch (error) {
      console.warn('Battery API not available:', error);
    }
  }

  /**
   * 네트워크 정보 업데이트
   */
  private updateNetworkInfo(): void {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
                      
    if (connection) {
      const effectiveType = connection.effectiveType || '';
      
      if (effectiveType.includes('slow') || effectiveType === '2g') {
        this.metrics.networkSpeed = 'slow';
      } else if (effectiveType.includes('3g')) {
        this.metrics.networkSpeed = 'medium';
      } else if (effectiveType.includes('4g') || effectiveType.includes('5g')) {
        this.metrics.networkSpeed = 'fast';
      }
      
      this.emit('networkChange', this.metrics.networkSpeed);
    }
  }

  /**
   * 화면 메트릭 업데이트
   */
  private updateScreenMetrics(): void {
    const win = globalThis.window;
    if (!win) return;

    const width = Math.min(win.innerWidth, win.innerHeight);
    
    let screenSize: string;
    if (width < 480) {
      screenSize = 'small';
    } else if (width < 768) {
      screenSize = 'medium';
    } else if (width < 1024) {
      screenSize = 'tablet';
    } else {
      screenSize = 'desktop';
    }

    if (screenSize !== this.metrics.screenSize) {
      this.metrics.screenSize = screenSize;
      
      // 화면 크기에 따른 자동 최적화
      if (screenSize === 'small' && this.config.compactLayout) {
        this.enableCompactLayout();
      }
      
      if (this.config.adaptiveFontSize) {
        this.adaptFontSize();
      }
    }
  }

  /**
   * 진동 피드백
   */
  vibrate(pattern: number | number[]): boolean {
    if (!this.config.enableVibration || !this.capabilities.vibrationSupport) {
      return false;
    }

    try {
      const nav = globalThis.navigator as any;
      if (nav.vibrate) {
        nav.vibrate(pattern);
        return true;
      }
    } catch (error) {
      console.warn('Vibration API error:', error);
    }

    return false;
  }

  /**
   * 최적화 해제
   */
  disable(): void {
    const doc = globalThis.document;
    if (!doc) return;

    // 클래스 제거 (Happy-DOM classList workaround)
    if (doc.body) {
      const classesToRemove = [
        'mobile-optimized',
        'battery-optimized',
        'reduced-motion',
        'compact-layout',
        'adaptive-fonts'
      ];
      const currentClasses = doc.body.className ? doc.body.className.split(' ') : [];
      const filteredClasses = currentClasses.filter(cls => !classesToRemove.includes(cls));
      doc.body.className = filteredClasses.join(' ');
    }

    // 스타일 요소 제거
    const styleIds = [
      'mobile-touch-optimizations',
      'mobile-battery-optimizations',
      'mobile-animation-reduction',
      'mobile-compact-layout',
      'mobile-adaptive-fonts'
    ];

    styleIds.forEach(id => {
      const style = doc.getElementById?.(id);
      if (style?.remove) {
        style.remove();
      }
    });

    this.isOptimized = false;
    this.emit('disabled');
    
    console.log('📱 Mobile optimizations disabled');
  }

  /**
   * 현재 설정 반환
   */
  getConfiguration(): MobileConfiguration {
    return { ...this.config };
  }

  /**
   * 기기 성능 반환
   */
  getCapabilities(): MobileCapabilities {
    return { ...this.capabilities };
  }

  /**
   * 모바일 메트릭 반환
   */
  getMetrics(): MobileMetrics {
    return { ...this.metrics };
  }

  /**
   * 최적화 상태 확인
   */
  isOptimizationEnabled(): boolean {
    return this.isOptimized;
  }

  /**
   * 최적화 요약 정보
   */
  getOptimizationSummary(): {
    applied: string[];
    capabilities: MobileCapabilities;
    metrics: MobileMetrics;
    recommendations: string[];
  } {
    const applied: string[] = [];
    const recommendations: string[] = [];

    if (this.config.enableTouchInput && this.capabilities.touchSupport) {
      applied.push('Touch Input Optimization');
    }

    if (this.metrics.batteryLevel < 0.3) {
      applied.push('Battery Optimization');
      recommendations.push('Enable power saving mode');
    }

    if (this.config.reduceAnimations) {
      applied.push('Animation Reduction');
    }

    if (this.metrics.screenSize === 'small' && this.config.compactLayout) {
      applied.push('Compact Layout');
    }

    if (this.config.adaptiveFontSize) {
      applied.push('Adaptive Font Size');
    }

    if (this.metrics.networkSpeed === 'slow') {
      applied.push('Network Optimization');
      recommendations.push('Reduce data usage');
    }

    if (this.metrics.deviceMemory < 4) {
      recommendations.push('Enable memory optimization');
    }

    if (this.metrics.cpuCores < 4) {
      recommendations.push('Reduce CPU intensive operations');
    }

    return {
      applied,
      capabilities: this.capabilities,
      metrics: this.metrics,
      recommendations
    };
  }
}

// 전역 모바일 최적화 인스턴스
export const mobileOptimizer = new MobileOptimizer();