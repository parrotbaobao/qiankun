import { AfterViewInit, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { registerMicroApps, start } from 'qiankun';
import { filter } from 'rxjs';
import { ApiService } from './core/services/api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],

})
export class AppComponent implements AfterViewInit, OnInit {
  currentUrl = '';
  isAd = false;
  isInHome = false;
  constructor(private router: Router, private cdr: ChangeDetectorRef, private apiService: ApiService) {
    this.currentUrl = this.router.url;
    this.router.events
      .subscribe((e) => {
        this.currentUrl = this.router.url;
      });
  }
  ngOnInit(): void {
    // 模拟调用 API 服务
    this.apiService.getUserById(1001).subscribe({
      next: (response) => {
        console.log('API 调用成功:', response);
        console.log('用户信息:', response.data);
      },
      error: (error) => {
        console.error('API 调用失败:', error);
      }
    });
  }

  ngAfterViewInit(): void {
    registerMicroApps([
      {
        name: 'sub-app',
        entry: 'http://localhost:8080/app1/',
        container: '#container',
        activeRule: (loc) => loc.pathname.startsWith('/sub-app')
      },
      {
        name: 'sub2-app2',
        entry: 'http://localhost:8080/app2/',
        container: '#container',
        activeRule: (loc) => loc.pathname.startsWith('/sub2-app2')
      },
    ]);

    start(
      {
        prefetch: "all",
        sandbox: {
          strictStyleIsolation: false,
          experimentalStyleIsolation: false,
        }
      }
    );
  }

  isActive(path: string) {
    return this.currentUrl === path;
  }

  goHostHome() {
    this.router.navigateByUrl('/home');
  }

  goHostAd() {
    this.router.navigateByUrl('/cloud-advisor');
  }

  goSubApp1() {
    this.router.navigateByUrl('/sub-app');
  }

  goSubApp2() {
    this.router.navigateByUrl('/sub2-app2');
  }
}
