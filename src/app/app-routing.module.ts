import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import {CalcComponent} from './calc/calc.component';

const routes: Routes = [
  {path: '', component: CalcComponent },
  {path: 'calc', component: CalcComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
