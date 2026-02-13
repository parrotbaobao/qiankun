import { AfterViewInit, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { registerMicroApps, start } from 'qiankun';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],

})
export class AppComponent implements AfterViewInit, OnInit {
  currentUrl = '';
  isAd = false;
  isInHome = false;
  constructor(private router: Router, private cdr: ChangeDetectorRef) {
    this.currentUrl = this.router.url;
    this.router.events
      .subscribe((e) => {
        this.currentUrl = this.router.url;
      });
    // window.addEventListener('hashchange', () => {
    //   console.log('hash:', window.location.hash);
    //   if (window.location.hash.includes('ad')) {
    //     this.isAd = true;
    //     this.isInHome = false;
    //   }
    //   else if (window.location.hash.includes('home')) {
    //     this.isAd = false;
    //     this.isInHome = true;
    //   } else {
    //     this.isAd = false;
    //     this.isInHome = false;
    //   }
    //   this.cdr.detectChanges()
    // });
  }
  ngOnInit(): void {
    // if (window.location.hash.includes('home')) {
    //   this.isAd = false;
    //   this.isInHome = true;
    // } else if (window.location.hash.includes('ad')) {
    //   this.isAd = true;
    //   this.isInHome = false;
    // } else {
    //   this.isAd = false;
    //   this.isInHome = false;
    // }
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
    // this.isAd = false;
    // window.location.hash = '#/home';
    this.router.navigateByUrl('/home');
  }

  goHostAd() {
    // this.isAd = false;
    // window.location.hash = '#/ad';
    this.router.navigateByUrl('/ad');

  }
  goSubApp1() {
    // this.isAd = true;
    this.router.navigateByUrl('/sub-app');

    // window.location.hash = '#/sub-app';
  }

  goSubApp2() {
    // this.isAd = true;
    this.router.navigateByUrl('/sub2-app2');

    // window.location.hash = '#/sub2-app2';
  }
}
