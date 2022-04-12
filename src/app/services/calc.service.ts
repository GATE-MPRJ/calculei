import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams, HttpRequest } from '@angular/common/http';
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


  // Start Function to Save and return calc
  // Salva o Calculos enviando o JSON como paramentro e retorna um tokem  
  pushSaveCalc(json: any){        
    const headers = new HttpHeaders().set('Content-Type', 'application/json; charset=UTF-8');    
    headers.append('Accept', 'application/json');
    headers.append( 'responseType', 'text' )    
    console.log(json);
    const body = json
    return this.httpClient.post(this.baseUrl + 'web/saveCalc', body,{ responseType: 'text' });    
  }
  // Rertorna um Arquivo Excel com base em um token gerado no saveCalc
  getExcel(token: string): Observable<Blob>{
    console.log(token)        
    return this.httpClient.get(this.baseUrl + "web/getExcel?token=" + token, { responseType: 'blob' });
  }  
  // Gerar QrCode  Base64 enviando o Texto a Largura e Altura
  getQrcode(content: string, width: number, height: number ) {
    return this.httpClient.get(this.baseUrl + "/qrlogo?text="+ content +"&width="+ width  + "&height=" + height, { responseType: 'json' }).pipe(retry(1), catchError(this.handleError))       
  }
  // Retorna o json do calculo Salvo Usando como paramentro o token 
  getJsonCalc(token: string) {
    return this.httpClient.get(this.baseUrl + "/getJsonCalc?token=" + token, { responseType: 'json' }).pipe(retry(1), catchError(this.handleError))       
  }
  //End

}
