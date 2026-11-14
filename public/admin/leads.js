export { states, sources, areas, limits, validateLead, ValidationError } from '../shared/validation.js';

const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function matches(lead, query, area, status) {
  return (!area || lead.area === area) && (!status || lead.status === status)
    && fold([lead.business, lead.contact, lead.town, lead.email, lead.phone].join(' ')).includes(fold(query.trim()));
}

export function localDate(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function isDue(lead, today = localDate()) {
  return Boolean(lead.followUp && lead.followUp <= today && !['cliente', 'descartado'].includes(lead.status));
}
