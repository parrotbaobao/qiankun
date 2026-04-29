import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';

interface SdkPackage {
  id: string;
  name: string;
  version: string;
  description: string;
  descriptionEn: string;
  maven: string | null;
  pip: string | null;
  go: string | null;
  npm: string | null;
  githubUrl: string;
  docUrl: string;
  publishedAt: string;
  changelog: string[];
  changelogEn: string[];
}

interface SdkGroup {
  lang: string;
  icon: string;
  packages: SdkPackage[];
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  sdkGroups: SdkGroup[] = [];
  activeLang = 'Java';
  loading = true;
  copied = '';

  constructor(private http: HttpClient, public translate: TranslateService) {}

  ngOnInit(): void {
    this.http.get<{ code: number; data: SdkGroup[] }>('/api/sdks').subscribe({
      next: (res) => { this.sdkGroups = res.data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  get activeGroup(): SdkGroup | undefined {
    return this.sdkGroups.find(g => g.lang === this.activeLang);
  }

  getInstallCmd(pkg: SdkPackage): string {
    return pkg.pip || pkg.go || pkg.npm || pkg.maven || '';
  }

  getChangelog(pkg: SdkPackage): string[] {
    return this.translate.currentLang === 'en' ? pkg.changelogEn : pkg.changelog;
  }

  getDesc(pkg: SdkPackage): string {
    return this.translate.currentLang === 'en' ? pkg.descriptionEn : pkg.description;
  }

  copy(text: string, id: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copied = id;
      setTimeout(() => { this.copied = ''; }, 2000);
    });
  }
}
