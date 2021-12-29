
import { LightningElement, api, wire, track } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { getRecord } from "lightning/uiRecordApi";
import OPPORTUNITY_OBJECT from '@salesforce/schema/Opportunity';
import { getPicklistValues } from 'lightning/uiObjectInfoApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import {deleteRecord} from 'lightning/uiRecordApi';

import NAME from "@salesforce/schema/Opportunity.Name";
import ACD_TYPE from "@salesforce/schema/Opportunity.Agency_Commission_Deduction_Type__c";
import AGENCY_COMMISSION_DEDUCTION from "@salesforce/schema/Opportunity.AgencyCommissionDeduction__c";
import DELAY_AGENCY_COMMISSION from "@salesforce/schema/Opportunity.DelayAgencyCommission__c";
import DELAY_AGENCY_COMMISSION_TILL from "@salesforce/schema/Opportunity.DelayAgencyCommissionTill__c";
import DAC_2ND_HALF_TILL from "@salesforce/schema/Opportunity.Delay_Agency_Commission_2nd_Half_Till__c";
import REQ_COMM from "@salesforce/schema/Opportunity.Requester_Comments__c";
import CM_AGENCY_NAME from "@salesforce/schema/Opportunity.cm_Agency_Name__c";

import holdCommissionUpdate from'@salesforce/apex/holdAndDelayOpptyController.holdCommissionUpdate';

const fields = [ACD_TYPE, NAME, DELAY_AGENCY_COMMISSION, DAC_2ND_HALF_TILL, AGENCY_COMMISSION_DEDUCTION, DELAY_AGENCY_COMMISSION_TILL, REQ_COMM, CM_AGENCY_NAME];
    
export default class HoldandDelayCommissionModal extends LightningElement {
    showModal = false;
    @api recordId;
    acdTypeOptions;
    oppRecord = {};
    showSpinner = false;
    DACHalfDisable = false;
    showFiles = false;
    @track uploadedFiles = [];

    @wire(getObjectInfo, { objectApiName: OPPORTUNITY_OBJECT }) oppMetadata;

    @wire(getPicklistValues, {recordTypeId: '$oppMetadata.data.defaultRecordTypeId', fieldApiName: ACD_TYPE}) 
    getACEType({data, error}){
        if(data){
            this.acdTypeOptions = [...data.values];
        }
        else if(error){
            this.showToast('Error', 'Error', error.body.message);
        }
    }

    @wire(getPicklistValues, {recordTypeId: '$oppMetadata.data.defaultRecordTypeId', fieldApiName: DELAY_AGENCY_COMMISSION}) 
    getDelayAgencyCommType({data, error}){
        if(data){
            this.delayAgencyCommOptions = [...data.values];
        }
        else if(error){
            this.showToast('Error', 'Error', error.body.message);
        }
    }

    @wire(getPicklistValues, {recordTypeId: '$oppMetadata.data.defaultRecordTypeId', fieldApiName: DELAY_AGENCY_COMMISSION_TILL}) 
    getDelayAgencyCommTillType({data, error}){
        if(data){
            this.delayAgencyCommTillOptions = [...data.values];
        }
        else if(error){
            this.showToast('Error', 'Error', error.body.message);
        }
    }

    @wire(getPicklistValues, {recordTypeId: '$oppMetadata.data.defaultRecordTypeId', fieldApiName: DAC_2ND_HALF_TILL}) 
    getDACHalfTill({data, error}){
        if(data){
            this.dACHalfTillOptions = [...data.values];
        }
        else if(error){
            this.showToast('Error', 'Error', error.body.message);
        }
    }

  @wire(getRecord, {
      recordId: "$recordId",
      fields
  })
  opp1({data, error}){

      if(data){
          console.log('undergetrecord', data);
          Object.keys(data.fields).forEach(key => {
              this.oppRecord[key] =  data.fields[key].value;
          });

          this.oppRecord.Id = this.recordId;

      }else if(error){
          this.showToast('Error', 'Error', error.body.message);
      }
  }

  handleACDTypeChange(event) {
      this.oppRecord.Agency_Commission_Deduction_Type__c = event.detail.value;
     
  }
  handleDelayAgencyCommChange(event) {
      this.oppRecord.DelayAgencyCommission__c = event.detail.value;
      if(this.oppRecord.DelayAgencyCommission__c === 'First Half') {
          this.DACHalfDisable = false;
      }
      else if(this.oppRecord.DelayAgencyCommission__c === 'Full') {
          this.template.querySelector('lightning-combobox[data-name="DAC Half Till"]').value = null;
          this.DACHalfDisable = true;
      }
  }
  handleDelayAgencyCommTill(event) {
      this.oppRecord.DelayAgencyCommissionTill__c = event.detail.value;
  }
  handleDACHalfTill(event) {
      this.oppRecord.Delay_Agency_Commission_2nd_Half_Till__c = event.detail.value;
      const halfTillVal = this.oppRecord.Delay_Agency_Commission_2nd_Half_Till__c;
      const FirstHalfVal = this.oppRecord.DelayAgencyCommissionTill__c;
      const holdVal = this.oppRecord.DelayAgencyCommission__c;
      console.log('----val----'+halfTillVal+'----FirstHalfVal----'+FirstHalfVal+'----holdVal----'+holdVal);
      if(holdVal === 'First Half'){
          if(FirstHalfVal === null) {
              this.showToast('Error', 'Error', 'Please select Delay Agency Commission Till value.'); 
              this.template.querySelector('lightning-combobox[data-name="DAC Half Till"]').value = null;
          }else {
              const firstHalfValueInt = FirstHalfVal.split("%");
              const secondHalfValueInt = halfTillVal.split("%"); 
              console.log('----firstHalfValueInt----'+firstHalfValueInt[0]+'----secondHalfValueInt----'+secondHalfValueInt[0]); 
              if(parseInt(firstHalfValueInt[0]) > parseInt(secondHalfValueInt[0])){
                  this.showToast('Error', 'Error', 'Delay Agency Commission Till should be less than Delay Agency Commission 2nd Half.');
                  this.template.querySelector('lightning-combobox[data-name="DAC Half Till"]').value = null;
                  this.oppRecord.Delay_Agency_Commission_2nd_Half_Till__c = null;
              }
          }
      }
  }
  handleReqComm(event) {
      this.oppRecord.Requester_Comments__c = event.target.value;
  }
  handleACDChange(event) {
      this.oppRecord.AgencyCommissionDeduction__c = event.target.value;
  }

  validationform() {
    const f1Val = this.oppRecord.Agency_Commission_Deduction_Type__c;
    const f2Val = this.oppRecord.AgencyCommissionDeduction__c;
    const f3Val = this.oppRecord.DelayAgencyCommission__c;
    const f4Val = this.oppRecord.DelayAgencyCommissionTill__c;
    const f5Val = this.oppRecord.Delay_Agency_Commission_2nd_Half_Till__c;

    console.log('----f1Val----'+f1Val+'----f2Val----'+f2Val+'----f3Val----'+f3Val+'----f4Val----'+f4Val+'----f5Val----'+f5Val);
    if(f1Val === null && f2Val === null && f3Val === null && f4Val === null && f5Val === null){      
        this.showToast('Error', 'Error', 'Please select the values.');
        return false;
    }else if(f1Val !== null && f1Val === 'Deduction %' && f2Val === null){
        this.showToast('Error', 'Error', 'Please provide Agency Commission Deduction value.');
        return false;
    }else if(f2Val !== null && f2Val > 10){
        this.showToast('Error', 'Error', 'Agency Commission Deduction should not be greater than 10.');
        return false;
    }else if(f3Val=='First Half' && (f4Val === null || f5Val === null)){
        this.showToast('Error', 'Error', 'Please select Delay Agency Commission Till and Delay Agency Commission 2nd Half.');
        return false;
    }else if(f3Val === 'First Half' && f4Val.split("%")[0] < 10){
        this.showToast('Error', 'Error', 'Delay Agency Commission Till should not be less than 10%.');
        return false;
    }else if(f3Val === 'Full' && f4Val === null){
        this.showToast('Error', 'Error', 'Please select Delay Agency Commission Till .');
        return false;
    }else if(f3Val === 'Full' && f5Val !== null){
        this.template.querySelector('lightning-combobox[data-name="DAC Half Till"]').value = null;
        this.DACHalfDisable = true;
        this.showToast('Error', 'Error', 'Delay Agency Commission 2nd Half should not be selected for FULL Delay Agency Commission.');
        return false;
    }else if(f2Val !== null && f1Val === null){
        this.showToast('Error', 'Error', 'Please select Agency Commission Deduction Type');
        return false;
    }else if((f4Val !== null || f5Val !== null) && f3Val === null){
        this.showToast('Error', 'Error', 'Please select Delay Agency Commission');
        return false;
    }else{
        return true;
    }


  }

  handleSubmitModal() {
      if(this.validationform()) {
        this.oppRecord.Id = this.recordId;
        this.showSpinner = true;
        console.log('Oppty Data is : ', this.oppRecord)
        holdCommissionUpdate({ objOpportunity: this.oppRecord })
            .then(result => {
                this.showToast('Success', 'Success', result);
                this.showSpinner = false;
            })
            .catch(error => {
                this.error = error;
                console.log(this.error);

                this.showToast('Error', 'Error', error.body.message);
                this.showSpinner = false;
            })
      }
  }

  @api show() {
        this.showModal = true;
    }

  hide() {
        this.showModal = false;
    }

  showToast(type, title, message) {
      const evt = new ShowToastEvent({
          title: title,
          message: message,
          variant: type,
      });
      this.dispatchEvent(evt);
  }

  handleUploadFinished(event) {
      this.uploadedFiles = event.detail.files;
      this.showFiles = true;
      let uploadedFileNames = '';
        for(let i = 0; i < this.uploadedFiles.length; i++) {
            uploadedFileNames += this.uploadedFiles[i].name + ', ';
        }
      this.showToast('Success', 'Success', this.uploadedFiles.length + ' Files uploaded Successfully: ' + uploadedFileNames);
  }
  handleDeleteFile(event){
    const id = event.target.value;
    deleteRecord(id)
        .then(() => {
            this.showToast('Success', 'Success','File Deleted sucessfully');
            this.uploadedFiles = this.uploadedFiles.filter(function(obj) {
                return obj.documentId !== id;
            });
        })
        .catch(this.showToast('Error', 'Error', 'Error in File deletion'));
    }
}