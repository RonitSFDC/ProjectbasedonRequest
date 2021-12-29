import {LightningElement,api,track} from 'lwc';
import uploadFiles from '@salesforce/apex/AccountFileMultiUpload.uploadFiles';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class FileComponentExample extends LightningElement {

    @track filesUploaded = [];
    @track filesToUpload = [];
    @api strRecordId ;
    indexNumberOfFile = 0;
    handleFileUploaded(event) {
        console.log('##event.target.files', event.target.files);
        if (event.target.files.length > 0) {
            let files = [];
            for(var i=0; i< event.target.files.length; i++){
                let file = event.target.files[i];
                let reader = new FileReader();
                reader.onload = e => {
                    let base64 = 'base64,';
                    let content = reader.result.indexOf(base64) + base64.length;
                    let fileContents = reader.result.substring(content);
                    this.filesUploaded.push({PathOnClient: file.name, Title: file.name, VersionData: fileContents,Type:'', showOtherInput:false, indexNum: JSON.parse(JSON.stringify(this.indexNumberOfFile)), otherInputValue:''});
                };
                reader.readAsDataURL(file);
                this.indexNumberOfFile++;
            }
            console.log('###this.filesUploaded==', JSON.parse(JSON.stringify(this.filesUploaded)));
            console.log('###this.indexNumberOfFile==', this.indexNumberOfFile);
        }
    }

    attachFiles(event){
        var uploadedTitle = this.template.querySelectorAll(
            'lightning-combobox'
        );
        var validForUpload = true;
        uploadedTitle.forEach(file =>{
            console.log(file.value);
            if(file ==null || file.value == null ||file.value == ''){
                file.setCustomValidity('You have to Select Type');
                validForUpload = false;
            }
            else{
                file.setCustomValidity('');
            }
            file.reportValidity();

        });
        if(validForUpload){
            console.log('this.strRecordId'+this.strRecordId);
            console.log('##this.filesUploaded=', this.filesUploaded);
            uploadFiles({files: this.filesUploaded, recordId: this.strRecordId})
            .then(result => {
                if(result == true) {
                    this.showToastMessage('Success','Files uploaded', 'success');
                    this.filesUploaded = [];
                }else{
                    this.showToastMessage('Error','Error uploading files', 'error');
                }
            })
            .catch(error => {
                this.showToastMessage('Error','Error uploading files', 'error');
            });
        }
    }

    showToastMessage(title,message,variant){
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant
            })
        );
    }
    get options() {
        return [
            { label: 'Passport', value: 'Passport' },
            { label: 'Visa', value: 'Visa' },
            { label: 'National ID', value: 'National ID'},
            { label: 'Emirates ID', value: 'Emirates ID' },
            { label: 'Bank Statement', value: 'Bank Statement' },
            { label: 'MOA', value: 'MOA' },
            { label: 'Bulk', value: 'Bulk' },
            { label: 'Others', value: 'Others' }
        ];
    }

    handleChange(event) {
        this.value = event.detail.value;
        let currentRowIndexNum = event.target.title;
        console.log('###currentRowIndexNum=', currentRowIndexNum);
        this.filesUploaded.forEach(file=>{
            console.log('file title: '+file.Title);
            if(file.Title == event.target.dataset.id){
                console.log('true');
                file.PathOnClient = event.detail.value+'.'+file.Title.split('.')[1];
                file.Title = event.detail.value+'.'+file.Title.split('.')[1];
                file.Type = event.detail.value;
                //this.filesToUpload.push({PathOnClient: event.detail.value+'.'+file.Title.split('.')[1], Title: event.detail.value+'.'+file.Title.split('.')[1], VersionData: file.fileContents})
            }
            if( file.indexNum ==  currentRowIndexNum && event.detail.value == 'Others'){
                file.showOtherInput = true;
            }
        });

        
    }
    handleDelete(event){
        var updatedFilesUploaded = []
        this.filesUploaded.forEach(file=>{
            console.log('file title: '+file.Title);
            if(file.Title != event.target.dataset.id){
                console.log('true');
                updatedFilesUploaded.push({PathOnClient: file.PathOnClient, Title: file.Title, VersionData: file.fileContents, Type: file.Type});
            }
        });
        this.filesUploaded = updatedFilesUploaded;
    }
    handleOtherInputChange(event){
        console.log('file title: ', event.target.value, event.target.name, event.target.title);
        let currentRowIndexNum = event.target.title;
        let inputValue =  event.target.value;
        this.filesUploaded.forEach(file=>{
            if( file.indexNum ==  currentRowIndexNum){
                file.otherInputValue = inputValue;
            }
        });
        console.log('###this.filesUploaded', this.filesUploaded);
    }
}