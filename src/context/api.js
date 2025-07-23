import host from './host';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const handleApiError = error => {
  console.log('error in handle api error', error?.response?.data?.message);
  return error?.response?.data?.message || error?.response?.data?.errors;
};

const getToken = async () => {
  const token = await AsyncStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Token not found');
  }
  console.log('Retrieved token:', token);
  return token;
};

const saveToken = async token => {
  if (token) {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.setItem('auth_token', token);
  }
};

//post

export const SignUp = async (name, phone_number) => {
  console.log('555555555555555555555', phone_number);
  try {
    const response = await axios.post(`${host}auth/register`, {
      name,
      phone_number,
    });

    console.log('555555555555555555555', response.data);

    const token = response.data.verification_token;
    console.log('token', token);
    await saveToken(token);
    return token;
  } catch (error) {
    console.log('new log:', error?.response?.data || error.message);
    // return error?.response?.data?.errors.phone_number;
    throw handleApiError(error);
  }
};

export const Loginuser = async phone_number => {
  try {
    const response = await axios.post(`${host}auth/login`, {
      phone_number,
    });
    console.log('4444444444', response.data);
    const token = response.data.check_token;
    await saveToken(token);
    return token;
  } catch (error) {
    console.log('new log: ', error?.response?.data);
    throw handleApiError(error);
  }
};

export const DeviceToken = async (token, device_type) => {
  try {
    const token2 = await getToken();
    const response = await axios.post(
      `${host}users/update-device-token`,
      {
        token,
        device_type,
      },
      {
        headers: {
          Authorization: `Bearer ${token2}`,
        },
      },
    );
    console.log('4444444444', response.data);
    return response;
  } catch (error) {
    console.log('new log: ', error?.response?.data);
    throw handleApiError(error);
  }
};

export const SendOTP = async (otp, login) => {
  console.log('OTP');

  console.log('aaaa', otp);

  try {
    const token = await getToken();
    const response = await axios.post(
      `${host}auth/verify-otp`,
      {
        otp: String(otp),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    console.log('Send OTP', response.data.token);
    console.log(response);

    const token2 = response.data.token;
    await saveToken(token2);
    await login(token2);
    return token2;
  } catch (error) {
    console.log('new log: ', error);
    throw handleApiError(error);
  }
};

export const ResendOTP = async () => {
  try {
    const token = await getToken();
    console.log('resent', token);
    const response = await axios.post(
      `${host}auth/resend-otp`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    console.log('ResendOTP', response.data);

    return response.data;
  } catch (error) {
    console.log('new log: ', error?.response?.data);
    throw handleApiError(error);
  }
};

export const favorite = async salon_id => {
  try {
    const token = await getToken();
    const response = await axios.post(
      `${host}users/favorites`,
      {
        salon_id,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    // console.log('favorite', response.data.data);
    return response.data;
  } catch (error) {
    console.log('new fav: ', error?.response?.data?.message);
    throw handleApiError(error);
  }
};

export const appointment = async () => {
  try {
    const token = await getToken();
    const response = await axios.post(
      `${host}users/cart/checkout`,
      {
        payment_method: 'cash',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    console.log('Checkout', response.data);
    return response.data;
  } catch (error) {
    console.log('new fav: ', error?.response?.data?.message);
    throw handleApiError(error);
  }
};

export const Cart = async (
  salon_id,
  service_id,
  employee_id,
  appointment_day,
  start_time,
  end_time,
  isSubService,
) => {
  try {
    const token = await getToken();

    let response; // Declare the variable outside the conditional block

    if (isSubService === 1) {
      if (employee_id === null) {
        response = await axios.post(
          `${host}users/cart`,
          {
            salon_id,
            service_id: null,
            sub_service_id: service_id,
            employee_id: null,
            appointment_day,
            start_time,
            end_time,
            isSubService,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      } else {
        response = await axios.post(
          `${host}users/cart`,
          {
            salon_id,
            service_id: null,
            sub_service_id: service_id,
            employee_id,
            appointment_day,
            start_time,
            end_time,
            isSubService,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }
    } else {
      if (employee_id === null) {
        response = await axios.post(
          `${host}users/cart`,
          {
            salon_id,
            service_id: service_id,
            sub_service_id: null,
            employee_id: null,
            appointment_day,
            start_time,
            end_time,
            isSubService,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      } else {
        response = await axios.post(
          `${host}users/cart`,
          {
            salon_id,
            service_id: service_id,
            sub_service_id: null,
            employee_id,
            appointment_day,
            start_time,
            end_time,
            isSubService,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }
    }

    console.log('Cart', response.data);
    return response.data;
  } catch (error) {
    console.log('new fav: ', error?.response?.data?.message);
    throw handleApiError(error);
  }
};

export const Checkout = async payment_method => {
  try {
    const token = await getToken();
    const response = await axios.post(
      `${host}users/cart/checkout`,
      {
        payment_method,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    console.log('checkout', response.data.data);
    return response.data;
  } catch (error) {
    console.log('new fav: ', error?.response?.data?.message);
    throw handleApiError(error);
  }
};

export const ChangeAppoint = async (
  id,
  appointment_day,
  start_time,
  end_time,
  employee_id,
) => {
  try {
    const token = await getToken();
    const response = await axios.put(
      `${host}users/appointments/${id}/change-time`,
      {
        appointment_day,
        start_time,
        end_time,
        employee_id,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    console.log('ChangeAppoint', response.data.data);
    return response.data;
  } catch (error) {
    console.log('new fav: ', error?.response?.data?.message);
    throw handleApiError(error);
  }
};

export const Logout = async logout2 => {
  console.log('here 1');

  try {
    console.log('here 2');
    const token = await getToken();
    const res = await axios.post(
      `${host}users/logout`,
      {},
      {
        headers: {Authorization: `Bearer ${token}`},
      },
    );
    if (res) {
      console.log('Logout res', res);
      logout2();
    }
  } catch (error) {
    console.log('Logout Error', error);
    handleApiError(error);
  }
};

//get

export const getHome = async () => {
  try {
    const response = await axios.get(`${host}users/home`);
    // console.log('homeT', response.data.data);
    return response.data.data;
  } catch (error) {
    console.log('new log getHome: ', error);
    throw handleApiError(error);
  }
};

export const getHomewi = async () => {
  try {
    const token = await getToken();
    const response = await axios.get(`${host}users/home`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // console.log('homeT', response.data.data);
    return response.data.data;
  } catch (error) {
    console.log('new log getHome: ', error?.response?.data);
    throw handleApiError(error);
  }
};

export const getViewAll = async (p = 1) => {
  try {
    const response = await axios.get(`${host}users/salons?p=${p}`);
    // console.log('homeT', response.data);
    return response.data;
  } catch (error) {
    console.log('new log getViewAll: ', error?.response?.data);
    console.log('new log getViewAll0000: ', error);
    throw handleApiError(error);
  }
};

export const getFilterService = async () => {
  console.log('service HERE');

  try {
    const response = await axios.get(`${host}users/get-services`);
    // console.log('servicesT', response?.data?.data);
    return response?.data?.data;
  } catch (error) {
    console.log('new log: ', error?.response?.data);
    throw handleApiError(error);
  }
};

export const getSubServices = async uuid => {
  console.log('uuid...........', uuid);
  try {
    const response = await axios.get(
      `${host}users/service/${uuid}/sub-services`,
    );
    console.log('servicesT........', response.data.data);
    return response.data.data;
  } catch (error) {
    console.log('new log: ', error?.response?.data);
    throw handleApiError(error);
  }
};

export const getServices = async (id, uuid) => {
  console.log(`ID : ${id} , uuid : ${uuid}`);
  console.log(`${host}users/subcategory/${uuid}/salon/${id}/services`);
  try {
    const response = await axios.get(
      `${host}users/subcategory/${uuid}/salon/${id}/services`,
    );
    // console.log('servicesT', response.data.data);
    return response.data.data;
  } catch (error) {
    console.log('new log: ', error?.response?.data);
    throw handleApiError(error);
  }
};

export const getAddress = async () => {
  try {
    const response = await axios.get(`${host}users/get-address`);
    // console.log('address', response.data.data);
    return response.data.data;
  } catch (error) {
    console.log('new log: ', error?.response?.data);
    throw handleApiError(error);
  }
};

export const getSearch = async query => {
  try {
    const response = await axios.get(`${host}users/salons/search?`, {
      params: {
        query,
      },
    });
    // console.log('search', response.data.data);
    return response.data.data;
  } catch (error) {
    console.log('new log: ', error?.response?.data);
    throw handleApiError(error);
  }
};

export const getFilter = async (
  services,
  address_id,
  price_sort = '',
  min_price,
  max_price,
  is_popular,
) => {
  try {
    console.log({
      services,
      address_id,
      price_sort,
      min_price,
      max_price,
      is_popular,
    });

    const response = await axios.get(`${host}users/salons/filter`, {
      params: {
        services,
        address_id,
        price_sort,
        min_price,
        max_price,
        is_popular,
      },
      headers: {
        Accept: 'application/json',
      },
    });
    console.log(`min_p : ${min_price} , max_p : ${max_price}`);

    console.log('filter 11111111111111111111', response.data);
    return response.data.data;
  } catch (error) {
    console.log('new log: ', error?.response?.data?.exception);
    console.log('new log message: ', error?.response?.data?.message);
    throw handleApiError(error);
  }
};

export const getSalons = async id => {
  // console.log(id, 'uuid...........', id);
  try {
    const response = await axios.get(`${host}users/salons/${id}`);
    // console.log('salon::', response.data.data);
    return response.data.data;
  } catch (error) {
    console.log('new log: salon::', error?.response?.data);
    throw handleApiError(error);
  }
};

export const getCategory = async id => {
  try {
    const response = await axios.get(`${host}users/categories/salon/${id}`);
    // console.log('salon:::::::::::::::', response.data.data);
    return response.data.data;
  } catch (error) {
    console.log('new log getCategory: ', error?.response?.data);
    throw handleApiError(error);
  }
};

export const getSubCategory = async (id, salon_id) => {
  try {
    const response = await axios.get(
      `${host}users/categories/${id}/salon/${salon_id}/sub-categories`,
    );
    console.log('salon:::::::::::::::', response.data.data);
    return response.data.data;
  } catch (error) {
    console.log('new log getCategory: ', error?.response?.data);
    throw handleApiError(error);
  }
};

export const IFfavorite = async id => {
  try {
    const token = await getToken();
    const response = await axios.get(`${host}users/favorites/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // console.log('favorite', response.data.data);
    return response.data.data;
  } catch (error) {
    console.log('new fav: ', error?.response?.data?.message);
    throw handleApiError(error);
  }
};

export const getfavorite = async () => {
  try {
    const token = await getToken();
    const response = await axios.get(`${host}users/favorites`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // console.log('favorite', response.data.data);

    return response.data.data;
  } catch (error) {
    console.log('new fav: ', error?.response);
    throw handleApiError(error);
  }
};

export const getCart = async () => {
  try {
    const token = await getToken();
    const response = await axios.get(`${host}users/cart`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // console.log('Cart', response.data);

    return response.data;
  } catch (error) {
    console.log('new fav: ', error?.response?.data?.message);
    throw handleApiError(error);
  }
};

export const getAppoint = async (page = 1) => {
  try {
    const token = await getToken();
    const response = await axios.get(
      `${host}users/appointments/my-appointments?p=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    // console.log('Appoint', response.data);

    return response.data.data;
  } catch (error) {
    console.log('new fav: ', error?.response?.data?.message);
    throw handleApiError(error);
  }
};
export const getAppointViewall = async (page = 1) => {
  try {
    const token = await getToken();
    const response = await axios.get(
      `${host}users/appointments/my-appointments?p=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    // console.log('Appoint', response.data);

    return response.data;
  } catch (error) {
    console.log('new fav: ', error?.response?.data?.message);
    throw handleApiError(error);
  }
};

export const getAppointByID = async id => {
  try {
    const token = await getToken();
    const response = await axios.get(`${host}users/appointments/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // console.log('Appoint', response.data.data);

    return response.data.data;
  } catch (error) {
    console.log('new fav: ', error?.response?.data?.message);
    throw handleApiError(error);
  }
};

export const getEmployee = async (salonId, serviceId, isSubService) => {
  console.log(
    `salonId: ${salonId}, serviceId:::::: ${serviceId}, isSubService: ${isSubService}`,
  );

  // console.log(
  //   `Request URL: ${`${host}users/salons/${salonId}/services/${serviceId}/employee-available`}`,
  // );
  // console.log(`Request Params: { isSubService: ${isSubService} }`);

  try {
    // Sending request with strict boolean
    const response = await axios.get(
      `${host}users/salons/${salonId}/services/${serviceId}/employee-available`,
      {
        params: {
          isSubService: isSubService,
        },
      },
    );

    // console.log('Employees:', response.data.data.employees);
    return response.data.data.employees;
  } catch (error) {
    console.log(
      'Error fetching employees:',
      error?.response?.data?.errors || error?.response?.data?.message,
    );
    throw handleApiError(error);
  }
};

export const getTime = async (
  salon_id,
  service_id,
  date,
  employee_id,
  isSubService,
) => {
  console.log(
    `salonId: ${salon_id}, serviceId: ${service_id},Date : ${date}, employee_id ${employee_id}, isSubService: ${isSubService}`,
  );

  if (employee_id === null) {
    try {
      const response = await axios.get(
        `${host}users/salons/${salon_id}/services/${service_id}/available-times`,
        {
          params: {
            date: date,
            isSubService: isSubService,
          },
        },
      );
      // console.log('timeAppoint', response.data.data.slots.available.times);

      return response.data.data.slots;
    } catch (error) {
      console.log('new Time: ', error?.response?.data?.message);
      throw handleApiError(error);
    }
  } else {
    try {
      const response = await axios.get(
        `${host}users/salons/${salon_id}/services/${service_id}/available-times`,
        {
          params: {
            employee_id: employee_id,
            date: date,
            isSubService: isSubService,
          },
        },
      );
      // console.log('timeAppoint', response.data.data.slots.available.times);

      return response.data.data.slots;
    } catch (error) {
      console.log('new Time: ', error?.response?.data?.message);
      throw handleApiError(error);
    }
  }
};

export const GetNotifications = async (page = 1) => {
  try {
    const token = await getToken();
    const response = await axios.get(`${host}users/notification?page=${page}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // console.log(response.data.notifications[0].title);

    return response.data;
  } catch (error) {
    console.log('new get: ', error?.response?.data?.message);
    throw handleApiError(error);
  }
};

//delete

export const deletefavorite = async id => {
  try {
    const token = await getToken();
    const response = await axios.delete(`${host}users/favorites/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.log('new delete fav: ', error?.response?.data?.message);
    throw handleApiError(error);
  }
};

export const deleteCart = async id => {
  console.log('id', id);
  try {
    const token = await getToken();
    const response = await axios.delete(`${host}users/cart/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.log('new delete fav: ', error?.response?.data?.message);
    throw handleApiError(error);
  }
};

export const ClearCart = async () => {
  try {
    const token = await getToken();
    const response = await axios.delete(`${host}users/cart`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.log('new delete fav: ', error?.response?.data?.message);
    throw handleApiError(error);
  }
};

export const deleteAppoint = async id => {
  try {
    const token = await getToken();
    const response = await axios.delete(`${host}users/appointments/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.log('new delete fav: ', error?.response?.data?.message);
    throw handleApiError(error);
  }
};

//user

export const getusers = async () => {
  try {
    const token = await getToken();
    const response = await axios.get(`${host}users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // console.log('users', response.data.data);
    return response.data.data;
  } catch (error) {
    console.log('new log getusers: ', error?.response?.data);
    throw handleApiError(error);
  }
};

export const updateUsers = async (name, phone) => {
  try {
    const token = await getToken();
    const response = await axios.put(
      `${host}users/update`,
      {
        name,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    console.log('users', response.data.data);
    return response.data.data;
  } catch (error) {
    console.log('new log: ', error?.response?.data);
    throw handleApiError(error);
  }
};

export const DeleteUsers = async logout2 => {
  try {
    const token = await getToken();
    const response = await axios.delete(
      `${host}users/delete/account`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    console.log('users', response.data.data);
    logout2();
    return response.data.data;
  } catch (error) {
    console.log('new log DELETE: ', error?.message);
    logout2();
    throw handleApiError(error);
  }
};

//update

export const updateis_read = async notification_id => {
  const token = await getToken();
  console.log('bbbbbbbbbbbbbbbbbbbbb', token);
  try {
    const response = await axios.post(
      `${host}users/notification/mark-read`,
      {
        notification_id,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    // console.log('is_read', response.data.data);
    return response.data;
  } catch (error) {
    console.log('new is_read: ', error?.response?.data?.message);
    throw handleApiError(error);
  }
};
