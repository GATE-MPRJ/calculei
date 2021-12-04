import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { retry, catchError } from 'rxjs/operators';
//home/anderson_valgas/Documentos/OpenShift/CalcJud_Front/src/environments/environment.ts
@Injectable({
  providedIn: 'root'
})
export class CalcService {

  baseUrl  = 'calc/'; // api rest fake
  //baseUrl  = 'http://localhost:8090/calc/'; // api rest fake
  //https://h-gateprodata.mprj.mp.br/gate/api/Cidadao/teste
  constructor(private httpClient: HttpClient) { }
  httpOptions = {
    headers: new HttpHeaders({       
      'Content-Type': 'application/json',             
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers':'*'
      
    })
  }
  
  getIndice(indice: string,startDate: any, endDate: any) {
    return this.httpClient.get(this.baseUrl + indice +"/BetweenDates?startDate="+ startDate+ "&endDate=" + endDate,{ responseType: 'json' })      .pipe(
      retry(2),
      catchError(this.handleError)
    )                

  }

  getIgmp() {
    return this.httpClient.get(this.baseUrl + "/igpm/search/findByJoinedDateBetweenNative?startDate=01-07-1997&endDate=01-07-1998",this.httpOptions)      
      .pipe(
        retry(2),
        catchError(this.handleError)
      )      

  }

  handleError(error: HttpErrorResponse) {
    let errorMessage = '';
    if (error.error instanceof ErrorEvent) {
      // Erro ocorreu no lado do client
      errorMessage = error.error.message;
    } else {
      // Erro ocorreu no lado do servidor
      errorMessage = `Código do erro: ${error.status}, ` + `menssagem: ${error.message}`;
    }
    console.log(errorMessage);
    return throwError(errorMessage);
  };


}
