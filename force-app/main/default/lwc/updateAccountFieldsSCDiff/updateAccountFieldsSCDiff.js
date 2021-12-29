import { LightningElement, wire, api} from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import OPPTY_ACC_NAME from '@salesforce/schema/Opportunity.Account.Name';
import OPPTY_ACC_ID from '@salesforce/schema/Opportunity.Account.Id';
import OPPTY_ACC_RECORDTYPEID from '@salesforce/schema/Opportunity.Account.RecordTypeId';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const fields = [OPPTY_ACC_ID, OPPTY_ACC_NAME, OPPTY_ACC_RECORDTYPEID];

export default class UpdateAccountFieldsSCDiff extends LightningElement {

  @api recordId;

  @wire(getRecord, { recordId: '$recordId', fields })
    account;

    get name() {
        return getFieldValue(this.account.data, OPPTY_ACC_NAME);
    }
    get accRecId() {
        return getFieldValue(this.account.data, OPPTY_ACC_ID);
    }
    get recordTypeId() {
        return getFieldValue(this.account.data, OPPTY_ACC_RECORDTYPEID);
    }
    showToast(type, title, message) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: type,
        });
        this.dispatchEvent(evt);
    }
    handleSucess(event) {
        event.preventDefault();
        this.showToast('Success', 'Success', this.name + ' Succefully Updated');

    }
}