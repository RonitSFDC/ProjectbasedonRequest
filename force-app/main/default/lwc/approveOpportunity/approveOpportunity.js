/**
 * @description       : 
**/
import { LightningElement, api, wire, track} from 'lwc';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import ORDER_EVENT from "@salesforce/schema/Opportunity.Order_Event__c";
import ORDER_SOURCE from "@salesforce/schema/Opportunity.Order_Source__c";
import LR_WAIVER from "@salesforce/schema/Opportunity.LR_waiver__c";
import SPA_SINGED from "@salesforce/schema/Opportunity.SPA_Signed__c";
import SPA_PRINTED from "@salesforce/schema/Opportunity.SPA_Printed__c";
import CM_REASON_OF_REJECTION from "@salesforce/schema/Opportunity.cm_Reason_of_Rejection__c";
import PDC_COLLECTED from "@salesforce/schema/Opportunity.PDC_Collected__c";
import DOCUMENT_OK from "@salesforce/schema/Opportunity.Documents_OK__c";
import CM_APPROVAL_COMMENTS from "@salesforce/schema/Opportunity.cm_Approval_Comments__c";
import ALLOW_RESERVATION from "@salesforce/schema/Opportunity.Allow_Reservation__c";
import ACD_TYPE from "@salesforce/schema/Opportunity.Agency_Commission_Deduction_Type__c";
import DELAY_AGENCY_COMMISSION from "@salesforce/schema/Opportunity.DelayAgencyCommission__c";
import DAC_2ND_HALF_TILL from "@salesforce/schema/Opportunity.Delay_Agency_Commission_2nd_Half_Till__c";
import AGENCY_COMMISSION_DEDUCTION from "@salesforce/schema/Opportunity.AgencyCommissionDeduction__c";
import DELAY_AGENCY_COMMISSION_TILL from "@salesforce/schema/Opportunity.DelayAgencyCommissionTill__c";
import COMPLIANCE_PROCESS from "@salesforce/schema/Opportunity.Compliance_Process__c";


import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import OPPORTUNITY_OBJECT from '@salesforce/schema/Opportunity';
import { getPicklistValues } from 'lightning/uiObjectInfoApi';
import rejectOpp from'@salesforce/apex/approveOpportunityController.adminReject';
import approveOpp from'@salesforce/apex/approveOpportunityController.adminApprove';
import raiseTasks from'@salesforce/apex/approveOpportunityController.raiseTasks';
import scMandatoryInfo from'@salesforce/apex/approveOpportunityController.scMandatoryInfo';
import loadData from'@salesforce/apex/approveOpportunityController.loadData';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';
import { NavigationMixin } from "lightning/navigation";

import CustomStyle from "@salesforce/resourceUrl/CustomStyle";
import { loadStyle } from "lightning/platformResourceLoader";

const fields = [ORDER_EVENT, ORDER_SOURCE, LR_WAIVER, SPA_SINGED, SPA_PRINTED, CM_REASON_OF_REJECTION, 
    PDC_COLLECTED, DOCUMENT_OK, CM_APPROVAL_COMMENTS, ALLOW_RESERVATION , ACD_TYPE, DELAY_AGENCY_COMMISSION,
    DAC_2ND_HALF_TILL, AGENCY_COMMISSION_DEDUCTION, DELAY_AGENCY_COMMISSION_TILL, COMPLIANCE_PROCESS];

export default class ApproveOpportunity extends NavigationMixin(LightningElement){

    @api recordId;
    orderEventsOptions;
    orderSourcesOptions;
    lrWaiversOptions;
    spaSignedsOptions;
    pdcCollectedOptions;
    spaPrintedOptions;
    cmReasonOfRejectionsOptions;
    oppRecord = {};
    showSpinner = false;
    blnCheck = false;
    @track tableData = [];
    loadDataCalled = false;

    connectedCallback() {
        loadStyle(this, CustomStyle);
    }

    renderedCallback(){

        if(!this.loadDataCalled && this.recordId != undefined){
            this.loadData();
            this.loadDataCalled = true;
        }
    }

    loadData(){

        this.showSpinner = true;

        loadData({ oppId : this.recordId })
        .then(result => {

            this.tableData = result.checklistTypes;    
            this.showSpinner = false;
        })
        .catch(error => {
            this.error = error;
            console.log(this.error);
            this.handleError(error);
            this.blnCheck = true;
            this.showSpinner = false;

        })
    }

    @wire(getObjectInfo, { objectApiName: OPPORTUNITY_OBJECT }) oppMetadata

    @wire(getPicklistValues, {recordTypeId: '$oppMetadata.data.defaultRecordTypeId', fieldApiName: ORDER_EVENT}) getOrderEvent({data, error}){
        if(data){
            this.orderEventsOptions = [...data.values];
        }
        else if(error){
            this.handleError(error);
        }
    }

    @wire(getPicklistValues, {recordTypeId: '$oppMetadata.data.defaultRecordTypeId', fieldApiName: ORDER_SOURCE}) getOrderSources({data, error}){
        if(data){
            this.orderSourcesOptions = [...data.values];
        }
        else if(error){
            this.handleError(error);
        }
    }

    @wire(getPicklistValues, {recordTypeId: '$oppMetadata.data.defaultRecordTypeId', fieldApiName: LR_WAIVER}) getLRWaiver({data, error}){
        if(data){
            this.lrWaiversOptions = [...data.values];
        }
        else if(error){
            this.handleError(error);
        }
    }

    @wire(getPicklistValues, {recordTypeId: '$oppMetadata.data.defaultRecordTypeId', fieldApiName: SPA_SINGED}) getSPASigned({data, error}){
        if(data){
            this.spaSignedsOptions = [...data.values];
        }
        else if(error){
            this.showToast('Error', 'Error', error.body.message);
        }
    }
    
    @wire(getPicklistValues, {recordTypeId: '$oppMetadata.data.defaultRecordTypeId', fieldApiName: PDC_COLLECTED}) getPDCCollected({data, error}){
        if(data){
            this.pdcCollectedOptions = [...data.values];
        }
        else if(error){
            this.handleError(error);
        }
    }

    @wire(getPicklistValues, {recordTypeId: '$oppMetadata.data.defaultRecordTypeId', fieldApiName: SPA_PRINTED}) getSPAPrinted({data, error}){
        if(data){
            this.spaPrintedOptions = [...data.values];
        }
        else if(error){
            this.handleError(error);
        }
    }

    @wire(getPicklistValues, {recordTypeId: '$oppMetadata.data.defaultRecordTypeId', fieldApiName: CM_REASON_OF_REJECTION}) getCMReasonOfRejected({data, error}){
        if(data){
            this.cmReasonOfRejectionsOptions = [...data.values];
        }
        else if(error){
            this.handleError(error);
        }
    } 

    @wire(getRecord, {
        recordId: "$recordId",
        fields
    })
    opp1({data, error}){

        if(data){

            Object.keys(data.fields).forEach(key => {
                this.oppRecord[key] =  data.fields[key].value;
            });

            if(this.oppRecord.LR_waiver__c == null || this.oppRecord.LR_waiver__c == undefined){
                this.oppRecord.LR_waiver__c = '0%';
            }

            this.oppRecord.Id = this.recordId;

        }else if(error){
            this.handleError(error);
        }
    }

    handleOrderEventChange(event){
        this.oppRecord.Order_Event__c = event.target.value;
    }

    handleOrderSourceChange(event){
        this.oppRecord.Order_Source__c = event.target.value;
    }

    handleLRWaiverChange(event){
        this.oppRecord.LR_waiver__c = event.target.value;
    }

    handleSPAPrintedChange(event){
        this.oppRecord.SPA_Printed__c = event.target.value;
    }

    handleCMReasonOfRejection(event){
        this.oppRecord.cm_Reason_of_Rejection__c = event.target.value;
    }

    handlePDCollected(event){
        this.oppRecord.PDC_Collected__c = event.target.value;
    }

    handleSPASingedChange(event){
        this.oppRecord.SPA_Signed__c = event.target.value;
    }

    handleDocumentOk(event){
        this.oppRecord.Documents_OK__c = event.target.checked;
    }

    handleCMApprovalComments(event){
        this.oppRecord.cm_Approval_Comments__c = event.target.value;
    }

    rejectOpportunity(){

        if(this.validateRequiredFields() && this.validateFieldsForRejection()){

            this.oppRecord.Id = this.recordId;
            this.showSpinner = true;
            
            rejectOpp({ objOpportunity: this.oppRecord })
            .then(result => {
                this.showToast('Success', 'Success', 'Opportunity Rejected.');
                this.closeQuickAction();
                this.showSpinner = false;
            })
            .catch(error => {
                this.error = error;
                this.handleError(error);
                this.showSpinner = false;
            })
        }
    }

    approveOpportunity(){

        if(this.validateRequiredFields() && this.validateFieldsForApproval()){

            this.oppRecord.Id = this.recordId;
            this.showSpinner = true;

            approveOpp({ objOpportunity: this.oppRecord, checklistItemJson : JSON.stringify(this.tableData) })
            .then(result => {
                this.showToast('Success', 'Success', 'Opportunity Approved.');
                this.showSpinner = false;
                this.closeQuickAction();
            })
            .catch(error => {
                this.error = error;
                console.log(this.error);

                this.handleError(error);
                this.showSpinner = false;
            })
        }
    }

    validateRequiredFields(){
        
        if(this.oppRecord.Order_Event__c == null || this.oppRecord.Order_Event__c == '' || this.oppRecord.Order_Source__c == null || this.oppRecord.Order_Source__c == ''){
            this.showToast('Error', 'Error', 'Please fill the required fields.');
            return false;
        }
        return true;
    }

    validateFieldsForApproval(){

        if(this.oppRecord.cm_Reason_of_Rejection__c != null && this.oppRecord.cm_Reason_of_Rejection__c != ''){
            this.showToast('Error', 'Error', 'You can not enter rejection reason, while approving the opportunity.');
            return false;
        }
        if(this.oppRecord.LR_waiver__c == null || this.oppRecord.LR_waiver__c == ''){
            this.showToast('Error', 'Error', 'Please provide LR waiver');
            return false;
        }
        if(this.oppRecord.SPA_Printed__c == null || this.oppRecord.SPA_Printed__c == '' || this.oppRecord.SPA_Signed__c == null || this.oppRecord.SPA_Signed__c == ''){
            this.showToast('Error', 'Error', 'Please provide SPA Printed and SPA Signed status.');         
            return false;
        }
        if(this.oppRecord.PDC_Collected__c == null || this.oppRecord.PDC_Collected__c == ''){
            this.showToast('Error', 'Error', 'Please provide PDC Collected value.');
            return false;
        }
        else{
            return true;
        }    
    }

    validateFieldsForRejection(){

        if(this.oppRecord.cm_Approval_Comments__c == null || this.oppRecord.cm_Approval_Comments__c == '' || this.oppRecord.cm_Reason_of_Rejection__c == null || this.oppRecord.cm_Reason_of_Rejection__c == ''){
            this.showToast('Error', 'Error', 'Please provide comments and rejection reason before rejecting.');
            return false;
        }
        return true;
    }

    showToast(type, title, message) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: type,
        });
        this.dispatchEvent(evt);
    }

    closeQuickAction(){
        this.dispatchEvent(new CloseActionScreenEvent());
    }

    raiseTasks(){
        
        if(this.validateRequiredFields()){

            this.oppRecord.Id = this.recordId;
            this.showSpinner = true;

            raiseTasks({ objOpportunity: this.oppRecord, checklistItemJson : JSON.stringify(this.tableData) })
            .then(result => {
                this.showToast('Success', 'Success', 'Tasks Updated.');
                this.showSpinner = false;
                this.closeQuickAction();
            })
            .catch(error => {
                this.error = error;
                console.log(this.error);
                this.handleError(this.error);
                this.showSpinner = false;
            })
        }
    }

    scMandatoryInfo(){
      
        this.oppRecord.Id = this.recordId;
        this.showSpinner = true;

        scMandatoryInfo({ objOpportunity: this.oppRecord })
        .then(result => {
            console.log('result ',result);
            if(result === '0') {
              this.redirectToSecurityClearance(this.oppRecord.Id);
            }
        })
        .catch(error => {
            this.error = error;
            console.log(this.error);

            this.handleError(error);
            this.showSpinner = false;
        })
    }
    redirectToSecurityClearance(oppId) {
        let compDefinition = {
          componentDef: "c:securityClearance",
          attributes: {
            recordId: oppId
          }
        };
          // Base64 encode the compDefinition JS object
        let encodedCompDef = btoa(JSON.stringify(compDefinition));
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: '/one/one.app#' + encodedCompDef
            }
        });
    }
    raiseSplApprovals(){

        this.redirectToUrl('/apex/cm_InterimApprovals?id='+ this.recordId);

        
        /* var compDefinition = {
            componentDef: "c:cm_InterimApprovals",
            attributes: {}
        };
        // Base64 encode the compDefinition JS object
        var encodedCompDef = btoa(JSON.stringify(compDefinition));
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: '/one/one.app#' + encodedCompDef
            }
        }); */
     
    }
    
    redirectToUrl(url){

        const config = {
            type: 'standard__webPage',
            attributes: {
                url: url
            }
        };
        this[NavigationMixin.Navigate](config);
    }

    handleHoldDelay() {
        this.template.querySelector('c-holdand-delay-commission-modal').show();
    }

    handleAvailableChange(event){

        let index1 = event.target.dataset.index1;
        let index2 = event.target.dataset.index2;
        let index3 = event.target.dataset.index3;
        this.tableData[index1].checklistSections[index2].checklistItems[index3].Available__c =  event.target.checked;
    }

    handleRaiseATaskChange(event){

        let index1 = event.target.dataset.index1;
        let index2 = event.target.dataset.index2;
        let index3 = event.target.dataset.index3;
        this.tableData[index1].checklistSections[index2].checklistItems[index3].Raise_a_Task__c =  event.target.checked;
    }

    handleCommentsChange(event){

        let index1 = event.target.dataset.index1;
        let index2 = event.target.dataset.index2;
        let index3 = event.target.dataset.index3;
        this.tableData[index1].checklistSections[index2].checklistItems[index3].Comments__c = event.target.value;
    }

    handleError(error){

        if(error.body.message != undefined){

            this.showToast('Error', 'Error', error.body.message);

        }else if(error.body.pageErrors){

            error.body.pageErrors.forEach(pageError => this.showToast('Error', 'Error', pageError.message));

        }else if(error.body.fieldErrors){

            error.body.fieldErrors.forEach(fieldError => this.showToast('Error', 'Error', fieldError.message));

        }else{
            this.showToast('Error', 'Error', 'An error occured. Please check with your system admin.');
        }

    }
}