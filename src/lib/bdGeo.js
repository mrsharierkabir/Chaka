import divisionsData from 'bangladesh-geojson/divisions';
import districtsData from 'bangladesh-geojson/districts';
import upazilasData from 'bangladesh-geojson/upazilas';

const divisions = [...divisionsData.divisions].sort((a, b) => a.name.localeCompare(b.name));
const districts = districtsData.districts;
const upazilas = upazilasData.upazilas;

export function getDivisions() {
  return divisions;
}

export function getDistrictsByDivision(divisionId) {
  if (!divisionId) return [];
  return districts
    .filter((d) => d.division_id === String(divisionId))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getUpazilasByDistrict(districtId) {
  if (!districtId) return [];
  return upazilas
    .filter((u) => u.district_id === String(districtId))
    .sort((a, b) => a.name.localeCompare(b.name));
}
