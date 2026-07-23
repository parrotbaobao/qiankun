import { Injectable } from '@angular/core';
import * as rxjs from 'rxjs';
import find from 'lodash/find';
import padStart from 'lodash/padStart';
import random from 'lodash/random';
import round from 'lodash/round';

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  sales: number;
  createdAt: number;
  status: 'on' | 'off';
  thumbnail: string;
}

const CATEGORIES = ['数码', '家电', '服饰', '食品', '美妆', '母婴', '运动', '图书'];
const SUFFIX = ['尊享款', '经典款', '限量版', '新品', '爆款', '旗舰版', '青春版'];

function generateProducts(count: number): Product[] {
  const list: Product[] = [];
  for (let i = 0; i < count; i++) {
    list.push({
      id: i + 1,
      name: `商品-${padStart(String(i + 1), 5, '0')}-${SUFFIX[i % SUFFIX.length]}`,
      sku: `SKU-${random(100000, 999999)}`,
      category: CATEGORIES[i % CATEGORIES.length]!,
      price: round(random(9.9, 9999.9, true), 2),
      stock: random(0, 5000),
      sales: random(0, 200000),
      createdAt: Date.now() - random(0, 1000 * 60 * 60 * 24 * 365),
      status: Math.random() > 0.15 ? 'on' : 'off',
      thumbnail: `https://picsum.photos/seed/p${i + 1}/300/200`
    });
  }
  return list;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly _products$ = new rxjs.BehaviorSubject<Product[]>(generateProducts(10000));

  products$: rxjs.Observable<Product[]> = this._products$.asObservable();

  push$ = rxjs.interval(1000).pipe(rxjs.map(i => ({ heartbeat: i, t: Date.now() })));

  getAll(): Product[] {
    return this._products$.value;
  }

  getById(id: number): Product | undefined {
    return find(this._products$.value, p => p.id === id);
  }
}
